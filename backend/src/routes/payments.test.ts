import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');
vi.mock('../services/emailService.js', () => ({
  sendPaymentConfirmedEmail: vi.fn().mockResolvedValue(true),
  sendPaymentRejectedEmail: vi.fn().mockResolvedValue(true),
}));

import prisma from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import { sendPaymentConfirmedEmail, sendPaymentRejectedEmail } from '../services/emailService.js';
import paymentsRouter from './payments.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

process.env.PAYMENT_MVOLA_NUMBER = '034 00 000 00';
process.env.PAYMENT_ORANGE_MONEY_NUMBER = '032 00 000 00';
delete process.env.PAYMENT_AIRTEL_MONEY_NUMBER;
process.env.PAYMENT_ACCOUNT_NAME = 'All';

const adminAuth = { Authorization: `Bearer ${signToken({ userId: 'admin1', role: 'platform_admin', companyId: null })}` };
const buyerAuth = { Authorization: `Bearer ${signToken({ userId: 'buyer1', role: 'buyer', companyId: 'c1' })}` };
const otherAuth = { Authorization: `Bearer ${signToken({ userId: 'buyer2', role: 'buyer', companyId: 'c2' })}` };

beforeEach(() => {
  mockReset(prismaMock);
  vi.mocked(sendPaymentConfirmedEmail).mockClear();
  vi.mocked(sendPaymentRejectedEmail).mockClear();
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentsRouter);
  return app;
}

const baseOrder = {
  id: 'o1',
  orderNumber: 'ORD-1',
  checkoutGroup: 'g1',
  status: 'pending',
  total: 100000,
  companyId: null,
  userId: null,
  guestName: 'Rakoto Jean',
  guestEmail: 'jean@example.mg',
  guestPhone: '034 11 111 11',
  seller: { name: 'Vendeur 1' },
  paymentMethod: 'mvola',
  paymentStatus: 'awaiting',
  paymentReference: null,
  paymentPayerPhone: null,
  paymentSubmittedAt: null,
  paidAt: null,
  paymentRejectionReason: null,
  stockReserved: true,
};
const secondOrder = { ...baseOrder, id: 'o2', orderNumber: 'ORD-2', total: 50000, seller: null };

function mockGroup(overrides: Partial<any> = {}, second: Partial<any> = {}) {
  prismaMock.order.findUnique.mockResolvedValue({ ...baseOrder, ...overrides } as any);
  prismaMock.order.findMany.mockResolvedValue([
    { ...baseOrder, ...overrides },
    { ...secondOrder, ...overrides, id: 'o2', orderNumber: 'ORD-2', total: 50000, ...second },
  ] as any);
}

describe('GET /api/payments/methods', () => {
  it('lists only the methods whose merchant number is configured', async () => {
    const res = await request(buildApp()).get('/api/payments/methods');

    expect(res.status).toBe(200);
    expect(res.body.methods).toEqual([
      { id: 'mvola', label: 'MVola', number: '034 00 000 00', accountName: 'All' },
      { id: 'orange_money', label: 'Orange Money', number: '032 00 000 00', accountName: 'All' },
    ]);
  });
});

describe('GET /api/payments/status', () => {
  it('returns the group summary for the guest who placed the order', async () => {
    mockGroup();

    const res = await request(buildApp()).get('/api/payments/status?orderNumber=ORD-1&email=JEAN@example.mg');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      paymentStatus: 'awaiting',
      methodLabel: 'MVola',
      number: '034 00 000 00',
      totalAmount: 150000,
    });
    expect(res.body.orders.map((o: any) => o.orderNumber)).toEqual(['ORD-1', 'ORD-2']);
  });

  it('answers 404 for a wrong e-mail, without revealing that the order exists', async () => {
    mockGroup();

    const res = await request(buildApp()).get('/api/payments/status?orderNumber=ORD-1&email=autre@example.mg');

    expect(res.status).toBe(404);
  });

  it('allows the owning company but not another one', async () => {
    mockGroup({ guestEmail: null, guestName: null, companyId: 'c1' });

    const owner = await request(buildApp()).get('/api/payments/status?orderNumber=ORD-1').set(buyerAuth);
    const other = await request(buildApp()).get('/api/payments/status?orderNumber=ORD-1').set(otherAuth);

    expect(owner.status).toBe(200);
    expect(other.status).toBe(404);
  });
});

describe('POST /api/payments/submit', () => {
  const body = { orderNumber: 'ORD-1', email: 'jean@example.mg', reference: 'MP260920.1234.A56789', payerPhone: '034 11 111 11' };

  it('records the reference on every order of the checkout group', async () => {
    mockGroup();
    prismaMock.order.findFirst.mockResolvedValue(null);
    prismaMock.order.updateMany.mockResolvedValue({ count: 2 } as any);

    const res = await request(buildApp()).post('/api/payments/submit').send(body);

    expect(res.status).toBe(200);
    const args = prismaMock.order.updateMany.mock.calls[0][0] as any;
    expect(args.where.id.in).toEqual(['o1', 'o2']);
    expect(args.data).toMatchObject({
      paymentStatus: 'submitted',
      paymentReference: 'MP260920.1234.A56789',
      paymentPayerPhone: '034 11 111 11',
      paymentRejectionReason: null,
    });
  });

  it('refuses a reference already used by another checkout', async () => {
    mockGroup();
    prismaMock.order.findFirst.mockResolvedValue({ id: 'x' } as any);

    const res = await request(buildApp()).post('/api/payments/submit').send(body);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('déjà utilisée');
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it('refuses when the order is already paid', async () => {
    mockGroup({ paymentStatus: 'paid' });

    const res = await request(buildApp()).post('/api/payments/submit').send(body);

    expect(res.status).toBe(409);
  });

  it('refuses when the order is cancelled', async () => {
    mockGroup({ status: 'cancelled' });

    const res = await request(buildApp()).post('/api/payments/submit').send(body);

    expect(res.status).toBe(400);
  });

  it('allows submitting a new reference after a rejection', async () => {
    mockGroup({ paymentStatus: 'rejected', paymentRejectionReason: 'Montant incorrect' });
    prismaMock.order.findFirst.mockResolvedValue(null);
    prismaMock.order.updateMany.mockResolvedValue({ count: 2 } as any);

    const res = await request(buildApp()).post('/api/payments/submit').send(body);

    expect(res.status).toBe(200);
  });

  it('answers 404 to someone who does not own the order', async () => {
    mockGroup();

    const res = await request(buildApp()).post('/api/payments/submit').send({ ...body, email: 'autre@example.mg' });

    expect(res.status).toBe(404);
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ['référence trop courte', { reference: 'AB' }],
    ['caractères interdits', { reference: '<script>alert(1)</script>' }],
    ['téléphone manquant', { payerPhone: '' }],
  ])('validates the input (%s)', async (_label, patch) => {
    mockGroup();

    const res = await request(buildApp()).post('/api/payments/submit').send({ ...body, ...patch });

    expect(res.status).toBe(400);
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });
});

describe('admin payments', () => {
  it('rejects a non-admin user', async () => {
    const res = await request(buildApp()).get('/api/payments/admin').set(buyerAuth);
    expect(res.status).toBe(403);
  });

  it('lists the payments to verify, grouped by checkout', async () => {
    prismaMock.order.findMany.mockResolvedValue([
      { ...baseOrder, paymentStatus: 'submitted', paymentReference: 'REF1234', company: null, user: null, createdAt: new Date() },
      { ...secondOrder, paymentStatus: 'submitted', paymentReference: 'REF1234', company: null, user: null, createdAt: new Date() },
    ] as any);

    const res = await request(buildApp()).get('/api/payments/admin').set(adminAuth);

    expect(res.status).toBe(200);
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0]).toMatchObject({
      id: 'o1',
      reference: 'REF1234',
      totalAmount: 150000,
      buyer: { name: 'Rakoto Jean', email: 'jean@example.mg' },
    });
    expect((prismaMock.order.findMany.mock.calls[0][0] as any).where.paymentStatus).toBe('submitted');
  });

  it('confirms the payment: paid orders with reserved stock move to processing', async () => {
    mockGroup({ paymentStatus: 'submitted' }, { stockReserved: false });
    prismaMock.order.update.mockResolvedValue({} as any);

    const res = await request(buildApp()).patch('/api/payments/admin/o1/confirm').set(adminAuth);

    expect(res.status).toBe(200);
    expect(res.body.confirmed).toBe(2);
    const first = prismaMock.order.update.mock.calls[0][0] as any;
    const second = prismaMock.order.update.mock.calls[1][0] as any;
    expect(first.data).toMatchObject({ paymentStatus: 'paid', status: 'processing' });
    // Stock non réservé (rupture) : payée mais reste en attente de stock
    expect(second.data.paymentStatus).toBe('paid');
    expect(second.data.status).toBeUndefined();
    expect(sendPaymentConfirmedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ orderNumbers: ['ORD-1', 'ORD-2'], contactEmail: 'jean@example.mg', totalAmount: 150000 })
    );
  });

  it('refuses to confirm a payment that is already confirmed', async () => {
    mockGroup({ paymentStatus: 'paid' });

    const res = await request(buildApp()).patch('/api/payments/admin/o1/confirm').set(adminAuth);

    expect(res.status).toBe(409);
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('rejects a payment with a reason and notifies the buyer', async () => {
    mockGroup({ paymentStatus: 'submitted' });
    prismaMock.order.updateMany.mockResolvedValue({ count: 2 } as any);

    const res = await request(buildApp())
      .patch('/api/payments/admin/o1/reject')
      .set(adminAuth)
      .send({ reason: 'Transaction introuvable' });

    expect(res.status).toBe(200);
    const args = prismaMock.order.updateMany.mock.calls[0][0] as any;
    expect(args.data).toEqual({ paymentStatus: 'rejected', paymentRejectionReason: 'Transaction introuvable' });
    expect(sendPaymentRejectedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'Transaction introuvable', contactEmail: 'jean@example.mg' })
    );
  });

  it('requires a reason to reject', async () => {
    mockGroup({ paymentStatus: 'submitted' });

    const res = await request(buildApp()).patch('/api/payments/admin/o1/reject').set(adminAuth).send({});

    expect(res.status).toBe(400);
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown order', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    const res = await request(buildApp()).patch('/api/payments/admin/nope/confirm').set(adminAuth);

    expect(res.status).toBe(404);
  });
});
