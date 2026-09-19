import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');
vi.mock('../lib/cache.js', () => ({
  invalidateProductCache: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/emailService.js', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(true),
  sendOrderCancellationEmail: vi.fn().mockResolvedValue(true),
  sendOrderShippedEmail: vi.fn().mockResolvedValue(true),
  sendOrderDeliveredEmail: vi.fn().mockResolvedValue(true),
}));

import prisma from '../lib/prisma.js';
import { invalidateProductCache } from '../lib/cache.js';
import { signToken } from '../lib/auth.js';
import {
  sendOrderConfirmationEmail,
  sendOrderCancellationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
} from '../services/emailService.js';
import checkoutRouter from './checkout.js';
import { SHIPPING_COSTS, FREE_SHIPPING_THRESHOLD } from '../lib/shipping.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

const adminToken = signToken({ userId: 'admin1', role: 'platform_admin', companyId: null });
const buyerToken = signToken({ userId: 'buyer1', role: 'buyer', companyId: 'c1' });
const customerToken = signToken({ userId: 'cust1', role: 'customer', companyId: null });
const customerAuth = { Authorization: `Bearer ${customerToken}` };
const adminAuth = { Authorization: `Bearer ${adminToken}` };
const buyerAuth = { Authorization: `Bearer ${buyerToken}` };

beforeEach(() => {
  mockReset(prismaMock);
  vi.mocked(sendOrderConfirmationEmail).mockClear();
  vi.mocked(sendOrderCancellationEmail).mockClear();
  vi.mocked(sendOrderShippedEmail).mockClear();
  vi.mocked(sendOrderDeliveredEmail).mockClear();
  vi.mocked(invalidateProductCache).mockClear();
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/checkout', checkoutRouter);
  return app;
}

const validPayload = {
  items: [
    { productId: 'p1', quantity: 2 },
    { productId: 'p2', quantity: 1 },
  ],
  shippingAddress: {
    street: '12 rue des Champs',
    city: 'Antananarivo',
    postalCode: '101',
  },
  deliveryMethod: 'standard' as const,
};

function mockApprovedCompany(overrides: Partial<any> = {}) {
  prismaMock.company.findUnique.mockResolvedValue({
    id: 'c1',
    status: 'approved',
    paymentTerms: 'net_30',
    name: 'Grossiste Test',
    contactEmail: 'contact@test.example',
    contactPhone: null,
    ...overrides,
  } as any);
}

function mockHappyPath({ stockQuantity = 10 }: { stockQuantity?: number } = {}) {
  mockApprovedCompany();
  prismaMock.product.findMany.mockResolvedValue([
    { id: 'p1', name: 'Produit 1', price: 15000, moq: 1, unit: 'piece', stockQuantity, freeShipping: false, availableFrom: null, priceTiers: [] },
    { id: 'p2', name: 'Produit 2', price: 5000, moq: 1, unit: 'piece', stockQuantity, freeShipping: false, availableFrom: null, priceTiers: [] },
  ] as any);
  prismaMock.address.create.mockResolvedValue({ id: 'addr1', street: '12 rue des Champs', city: 'Antananarivo', postalCode: '101', country: 'Madagascar' } as any);
  prismaMock.order.create.mockResolvedValue({ id: 'order1', orderNumber: 'ORD-TEST', items: [] } as any);
  prismaMock.invoice.create.mockResolvedValue({ id: 'inv1', invoiceNumber: 'INV-TEST', dueDate: new Date() } as any);
  prismaMock.product.update.mockResolvedValue({} as any);
}

describe('POST /api/checkout', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(buildApp()).post('/api/checkout').send(validPayload);
    expect(res.status).toBe(401);
  });

  it('rejects a request from a company that is not approved', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 'c1', status: 'pending' } as any);

    const res = await request(buildApp()).post('/api/checkout').set(buyerAuth).send(validPayload);

    expect(res.status).toBe(403);
  });

  it('rejects an invalid payload', async () => {
    mockApprovedCompany();

    const res = await request(buildApp())
      .post('/api/checkout')
      .set(buyerAuth)
      .send({ items: [], deliveryMethod: 'standard' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Données invalides');
  });

  it('requires a shipping address unless the delivery method is retrait', async () => {
    mockApprovedCompany();

    const res = await request(buildApp())
      .post('/api/checkout')
      .set(buyerAuth)
      .send({ items: [{ productId: 'p1', quantity: 1 }], deliveryMethod: 'standard' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/[Aa]dresse/);
  });

  it('rejects an item below the product MOQ', async () => {
    mockApprovedCompany();
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Carton', price: 1200, moq: 25, unit: 'carton', stockQuantity: 100, freeShipping: false, availableFrom: null, priceTiers: [] },
    ] as any);

    const res = await request(buildApp())
      .post('/api/checkout')
      .set(buyerAuth)
      .send({ items: [{ productId: 'p1', quantity: 5 }], deliveryMethod: 'retrait' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/[Qq]uantité minimum/);
  });

  it('ignores any price sent by the client and resolves it server-side from price tiers', async () => {
    mockApprovedCompany();
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Carton', price: 1200, moq: 1, unit: 'carton', stockQuantity: 1000, freeShipping: false, availableFrom: null, priceTiers: [{ minQty: 100, unitPrice: 1000 }] },
    ] as any);
    prismaMock.address.create.mockResolvedValue({ id: 'addr1' } as any);
    prismaMock.order.create.mockResolvedValue({ id: 'order1', orderNumber: 'ORD-TEST', items: [] } as any);
    prismaMock.invoice.create.mockResolvedValue({ id: 'inv1', invoiceNumber: 'INV-TEST', dueDate: new Date() } as any);
    prismaMock.product.update.mockResolvedValue({} as any);

    const res = await request(buildApp())
      .post('/api/checkout')
      .set(buyerAuth)
      .send({
        items: [{ productId: 'p1', quantity: 150, price: 1 }], // le "price" client, s'il existe, est ignoré
        shippingAddress: validPayload.shippingAddress,
        deliveryMethod: 'standard',
      });

    expect(res.status).toBe(200);
    const orderCreateArgs = prismaMock.order.create.mock.calls[0][0] as any;
    expect(orderCreateArgs.data.items.create[0].price).toBe(1000); // palier appliqué, pas le prix envoyé par le client
    expect(orderCreateArgs.data.subtotal).toBe(150_000);
  });

  it('computes subtotal, shipping cost and total, and marks the order processing when stock is available', async () => {
    mockHappyPath();

    const res = await request(buildApp()).post('/api/checkout').set(buyerAuth).send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processing');
    // subtotal = 15000*2 + 5000*1 = 35000 (below the free-shipping threshold) → standard flat rate
    expect(res.body.total).toBe(35000 + SHIPPING_COSTS.standard);

    const orderCreateArgs = prismaMock.order.create.mock.calls[0][0] as any;
    expect(orderCreateArgs.data.subtotal).toBe(35000);
    expect(orderCreateArgs.data.shippingCost).toBe(SHIPPING_COSTS.standard);
    expect(orderCreateArgs.data.total).toBe(35000 + SHIPPING_COSTS.standard);
    expect(orderCreateArgs.data.status).toBe('processing');
    expect(orderCreateArgs.data.companyId).toBe('c1');
    expect(orderCreateArgs.data.userId).toBe('buyer1');
    expect(orderCreateArgs.data.paymentTerms).toBe('net_30');
  });

  it('creates an invoice alongside the order', async () => {
    mockHappyPath();

    const res = await request(buildApp()).post('/api/checkout').set(buyerAuth).send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.invoiceNumber).toBe('INV-TEST');
    const invoiceCreateArgs = prismaMock.invoice.create.mock.calls[0][0] as any;
    expect(invoiceCreateArgs.data.companyId).toBe('c1');
    expect(invoiceCreateArgs.data.orderId).toBe('order1');
    expect(invoiceCreateArgs.data.amount).toBe(35000 + SHIPPING_COSTS.standard);
  });

  it('applies free shipping once the subtotal reaches the free-shipping threshold', async () => {
    mockApprovedCompany();
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Produit 1', price: FREE_SHIPPING_THRESHOLD, moq: 1, unit: 'piece', stockQuantity: 10, freeShipping: false, availableFrom: null, priceTiers: [] },
    ] as any);
    prismaMock.address.create.mockResolvedValue({ id: 'addr1' } as any);
    prismaMock.order.create.mockResolvedValue({ id: 'order1', orderNumber: 'ORD-TEST', items: [] } as any);
    prismaMock.invoice.create.mockResolvedValue({ id: 'inv1', invoiceNumber: 'INV-TEST', dueDate: new Date() } as any);
    prismaMock.product.update.mockResolvedValue({} as any);

    const res = await request(buildApp())
      .post('/api/checkout')
      .set(buyerAuth)
      .send({ ...validPayload, items: [{ productId: 'p1', quantity: 1 }] });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(FREE_SHIPPING_THRESHOLD);
  });

  it('marks the order pending and skips stock decrement when stock is insufficient', async () => {
    mockHappyPath({ stockQuantity: 0 });

    const res = await request(buildApp()).post('/api/checkout').set(buyerAuth).send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });

  it('decrements stock for every purchased item when in stock', async () => {
    mockHappyPath({ stockQuantity: 10 });

    await request(buildApp()).post('/api/checkout').set(buyerAuth).send(validPayload);

    expect(prismaMock.product.update).toHaveBeenCalledTimes(2);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { stockQuantity: 8, inStock: true },
    });
  });

  it('sends the order confirmation email asynchronously without blocking the response', async () => {
    mockHappyPath();

    await request(buildApp()).post('/api/checkout').set(buyerAuth).send(validPayload);

    expect(sendOrderConfirmationEmail).toHaveBeenCalledTimes(1);
    const emailArg = vi.mocked(sendOrderConfirmationEmail).mock.calls[0][0];
    expect(emailArg.orderNumber).toBe('ORD-TEST');
    expect(emailArg.companyName).toBe('Grossiste Test');
  });

  it('returns 500 on unexpected errors', async () => {
    mockApprovedCompany();
    prismaMock.product.findMany.mockRejectedValue(new Error('db down'));

    const res = await request(buildApp()).post('/api/checkout').set(buyerAuth).send(validPayload);

    expect(res.status).toBe(500);
  });
});

describe('POST /api/checkout (particulier)', () => {
  function mockCustomerHappyPath() {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'cust1', email: 'client@example.com', firstName: 'Marie', lastName: 'Rakoto', phone: '0341234567',
    } as any);
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Carton', price: 1200, moq: 50, unit: 'carton', stockQuantity: 100, freeShipping: false, availableFrom: null, priceTiers: [{ minQty: 10, unitPrice: 800 }] },
    ] as any);
    prismaMock.address.create.mockResolvedValue({ id: 'addr1', street: '12 rue', city: 'Tana', postalCode: '101', country: 'Madagascar' } as any);
    prismaMock.order.create.mockResolvedValue({ id: 'order1', orderNumber: 'ORD-TEST', items: [] } as any);
    prismaMock.product.update.mockResolvedValue({} as any);
  }

  const payload = {
    items: [{ productId: 'p1', quantity: 50 }],
    shippingAddress: { street: '12 rue', city: 'Tana', postalCode: '101' },
    deliveryMethod: 'standard' as const,
  };

  it('enforces the MOQ for a customer too (vente en gros)', async () => {
    mockCustomerHappyPath();

    const res = await request(buildApp())
      .post('/api/checkout')
      .set(customerAuth)
      .send({ ...payload, items: [{ productId: 'p1', quantity: 12 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/[Qq]uantité minimum/);
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('orders at base price once the MOQ is reached, without wholesale tiers', async () => {
    mockCustomerHappyPath();

    const res = await request(buildApp())
      .post('/api/checkout')
      .set(customerAuth)
      .send({ ...payload, items: [{ productId: 'p1', quantity: 50 }] });

    expect(res.status).toBe(200);
    const args = prismaMock.order.create.mock.calls[0][0] as any;
    expect(args.data.items.create[0].price).toBe(1200);
    expect(args.data.subtotal).toBe(60_000);
  });

  it('creates no invoice and no payment terms for a customer, and links order and address to the user', async () => {
    mockCustomerHappyPath();

    const res = await request(buildApp()).post('/api/checkout').set(customerAuth).send(payload);

    expect(res.status).toBe(200);
    expect(res.body.invoiceNumber).toBeNull();
    expect(prismaMock.invoice.create).not.toHaveBeenCalled();
    expect(prismaMock.company.findUnique).not.toHaveBeenCalled();
    const orderArgs = prismaMock.order.create.mock.calls[0][0] as any;
    expect(orderArgs.data.companyId).toBeNull();
    expect(orderArgs.data.userId).toBe('cust1');
    expect(orderArgs.data.paymentTerms).toBeNull();
    expect(orderArgs.data.dueDate).toBeNull();
    const addressArgs = prismaMock.address.create.mock.calls[0][0] as any;
    expect(addressArgs.data.userId).toBe('cust1');
    expect(addressArgs.data.companyId).toBeUndefined();
  });

  it('emails the customer using their own name and address', async () => {
    mockCustomerHappyPath();

    await request(buildApp()).post('/api/checkout').set(customerAuth).send(payload);

    expect(sendOrderConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ companyName: 'Marie Rakoto', contactEmail: 'client@example.com' })
    );
  });
});

describe('GET /api/checkout/orders', () => {
  it('rejects a non-admin user', async () => {
    const res = await request(buildApp()).get('/api/checkout/orders').set(buyerAuth);
    expect(res.status).toBe(403);
  });

  it('lists all orders for an admin', async () => {
    prismaMock.order.findMany.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/checkout/orders').set(adminAuth);

    expect(res.status).toBe(200);
    expect(res.body.orders).toEqual([]);
  });
});

describe('GET /api/checkout/orders/mine', () => {
  it('rejects an unapproved company', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 'c1', status: 'pending' } as any);

    const res = await request(buildApp()).get('/api/checkout/orders/mine').set(buyerAuth);

    expect(res.status).toBe(403);
  });

  it('returns the orders scoped to the caller company', async () => {
    mockApprovedCompany();
    prismaMock.order.findMany.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/checkout/orders/mine').set(buyerAuth);

    expect(res.status).toBe(200);
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 'c1' } })
    );
  });
});

describe('GET /api/checkout/orders/mine (particulier)', () => {
  it('returns the orders placed by the customer user', async () => {
    prismaMock.order.findMany.mockResolvedValue([]);

    const res = await request(buildApp()).get('/api/checkout/orders/mine').set(customerAuth);

    expect(res.status).toBe(200);
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'cust1' } })
    );
  });
});

describe('PATCH /api/checkout/orders/:orderId/status', () => {
  function mockExistingOrder(overrides: Partial<any> = {}) {
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'o1',
      status: 'processing',
      items: [{ productId: 'p1', quantity: 2 }],
      ...overrides,
    } as any);
  }

  function mockUpdatedOrder(overrides: Partial<any> = {}) {
    prismaMock.order.update.mockResolvedValue({
      id: 'o1',
      orderNumber: 'ORD-TEST',
      status: 'shipped',
      total: 45000,
      deliveryMethod: 'standard',
      company: { name: 'Grossiste Test', contactEmail: 'contact@test.example' },
      customer: null,
      address: { street: '12 rue des Champs', city: 'Antananarivo', postalCode: '101', country: 'Madagascar' },
      invoice: null,
      items: [{ quantity: 2, price: 15000, product: { name: 'Produit 1' } }],
      ...overrides,
    } as any);
  }

  it('rejects a non-admin user', async () => {
    const res = await request(buildApp())
      .patch('/api/checkout/orders/o1/status')
      .set(buyerAuth)
      .send({ status: 'shipped' });

    expect(res.status).toBe(403);
  });

  it('rejects an invalid status', async () => {
    const res = await request(buildApp())
      .patch('/api/checkout/orders/o1/status')
      .set(adminAuth)
      .send({ status: 'not-a-status' });

    expect(res.status).toBe(400);
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when the order does not exist', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    const res = await request(buildApp())
      .patch('/api/checkout/orders/missing/status')
      .set(adminAuth)
      .send({ status: 'shipped' });

    expect(res.status).toBe(404);
  });

  it('updates the order status', async () => {
    mockExistingOrder();
    mockUpdatedOrder({ status: 'shipped' });

    const res = await request(buildApp())
      .patch('/api/checkout/orders/o1/status')
      .set(adminAuth)
      .send({ status: 'shipped' });

    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('shipped');
  });

  it('cancels the linked invoice when the order is cancelled', async () => {
    mockExistingOrder();
    mockUpdatedOrder({ status: 'cancelled', invoice: { id: 'inv1', status: 'sent' } });

    await request(buildApp())
      .patch('/api/checkout/orders/o1/status')
      .set(adminAuth)
      .send({ status: 'cancelled', reason: 'Rupture de stock' });

    expect(prismaMock.invoice.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: { status: 'cancelled' },
    });
  });

  it('restores stock for every item when cancelling a processing order', async () => {
    mockExistingOrder({
      status: 'processing',
      items: [
        { productId: 'p1', quantity: 2 },
        { productId: 'p2', quantity: 1 },
      ],
    });
    mockUpdatedOrder({ status: 'cancelled' });
    prismaMock.product.update.mockResolvedValue({} as any);

    await request(buildApp())
      .patch('/api/checkout/orders/o1/status')
      .set(adminAuth)
      .send({ status: 'cancelled', reason: 'Test' });

    expect(prismaMock.product.update).toHaveBeenCalledTimes(2);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { stockQuantity: { increment: 2 }, inStock: true },
    });
  });

  it('does not restore stock when cancelling a pending order (stock was never decremented)', async () => {
    mockExistingOrder({ status: 'pending' });
    mockUpdatedOrder({ status: 'cancelled' });

    await request(buildApp())
      .patch('/api/checkout/orders/o1/status')
      .set(adminAuth)
      .send({ status: 'cancelled' });

    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });
});

describe('GET /api/checkout/:orderNumber', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(buildApp()).get('/api/checkout/ORD-UNKNOWN');
    expect(res.status).toBe(401);
  });

  it('returns 404 when the order is not found', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/checkout/ORD-UNKNOWN').set(adminAuth);

    expect(res.status).toBe(404);
  });

  it('allows the owning company to read its own order', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'o1', orderNumber: 'ORD-1', companyId: 'c1' } as any);

    const res = await request(buildApp()).get('/api/checkout/ORD-1').set(buyerAuth);

    expect(res.status).toBe(200);
  });

  it('rejects a company reading another company order', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'o1', orderNumber: 'ORD-1', companyId: 'some-other-company' } as any);

    const res = await request(buildApp()).get('/api/checkout/ORD-1').set(buyerAuth);

    expect(res.status).toBe(403);
  });

  it('allows a platform admin to read any order', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ id: 'o1', orderNumber: 'ORD-1', companyId: 'some-other-company' } as any);

    const res = await request(buildApp()).get('/api/checkout/ORD-1').set(adminAuth);

    expect(res.status).toBe(200);
  });
});
