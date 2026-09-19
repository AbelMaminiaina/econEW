import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');
vi.mock('../lib/cache.js', () => ({
  withCache: (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
  CACHE_TTL: { PRODUCTS: 1, PRODUCT: 1, RELATED: 1 },
  CACHE_KEYS: { PRODUCTS: 'products', PRODUCT: 'product', RELATED: 'related' },
  invalidateProductCache: vi.fn().mockResolvedValue(undefined),
}));

import prisma from '../lib/prisma.js';
import { invalidateProductCache } from '../lib/cache.js';
import { signToken } from '../lib/auth.js';
import productsRouter from './products.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

const adminToken = signToken({ userId: 'admin1', role: 'platform_admin', companyId: null });
const buyerToken = signToken({ userId: 'buyer1', role: 'buyer', companyId: 'c1' });
const adminAuth = { Authorization: `Bearer ${adminToken}` };

beforeEach(() => {
  mockReset(prismaMock);
  vi.mocked(invalidateProductCache).mockClear();
});

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '50mb' })); // aligné sur src/index.ts
  app.use('/api/products', productsRouter);
  return app;
}

function baseProduct(overrides: Partial<any> = {}) {
  return {
    id: 'p1',
    name: 'Carton emballage',
    slug: 'carton-emballage',
    description: 'desc',
    shortDescription: 'short',
    category: 'emballage',
    price: 1200,
    stockQuantity: 5,
    inStock: true,
    isActive: true,
    images: [],
    dimensions: null,
    weight: null,
    moq: 1,
    unit: 'piece',
    estimatedWeightKg: null,
    freeShipping: false,
    availableFrom: null,
    priceTiers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('GET /api/products', () => {
  it('transforms category dashes and builds metadata', async () => {
    prismaMock.product.findMany.mockResolvedValue([baseProduct({ category: 'oeufs_frais' })] as any);

    const res = await request(buildApp()).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.products[0].category).toBe('oeufs-frais');
    expect(res.body.products[0].metadata).toEqual({ dimensions: null, weight: null });
  });

  it('filters by category, converting dashes to underscores', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);

    await request(buildApp()).get('/api/products?category=oeufs-frais');

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'oeufs_frais' }),
      })
    );
  });

  it('hides inactive products by default', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);

    await request(buildApp()).get('/api/products');

    expect(prismaMock.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) })
    );
  });

  it('includes inactive products when requested', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);

    await request(buildApp()).get('/api/products?includeInactive=true');

    const call = prismaMock.product.findMany.mock.calls[0][0] as any;
    expect(call.where.isActive).toBeUndefined();
  });

  it('returns 500 with details on failure', async () => {
    prismaMock.product.findMany.mockRejectedValue(new Error('db down'));

    const res = await request(buildApp()).get('/api/products');

    expect(res.status).toBe(500);
    expect(res.body.details).toBe('db down');
  });
});

describe('GET /api/products/:slug', () => {
  it('returns 404 when the product does not exist', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/products/unknown');

    expect(res.status).toBe(404);
  });

  it('returns the transformed product', async () => {
    prismaMock.product.findUnique.mockResolvedValue(baseProduct() as any);

    const res = await request(buildApp()).get('/api/products/carton-emballage');

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('carton-emballage');
  });
});

describe('PATCH /api/products/:productId/stock', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(buildApp())
      .patch('/api/products/p1/stock')
      .send({ stockQuantity: 1 });

    expect(res.status).toBe(401);
  });

  it('rejects a non-admin user', async () => {
    const res = await request(buildApp())
      .patch('/api/products/p1/stock')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ stockQuantity: 1 });

    expect(res.status).toBe(403);
  });

  it('rejects a negative stock quantity', async () => {
    const res = await request(buildApp())
      .patch('/api/products/p1/stock')
      .set(adminAuth)
      .send({ stockQuantity: -1 });

    expect(res.status).toBe(400);
    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });

  it('sets inStock to false when quantity reaches zero', async () => {
    prismaMock.product.update.mockResolvedValue(baseProduct({ stockQuantity: 0, inStock: false }) as any);

    const res = await request(buildApp())
      .patch('/api/products/p1/stock')
      .set(adminAuth)
      .send({ stockQuantity: 0 });

    expect(res.status).toBe(200);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { stockQuantity: 0, inStock: false },
    });
    expect(invalidateProductCache).toHaveBeenCalled();
  });
});

describe('PUT /api/products/:productId/price-tiers', () => {
  it('rejects a non-admin user', async () => {
    const res = await request(buildApp())
      .put('/api/products/p1/price-tiers')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ tiers: [] });

    expect(res.status).toBe(403);
  });

  it('rejects invalid tiers', async () => {
    const res = await request(buildApp())
      .put('/api/products/p1/price-tiers')
      .set(adminAuth)
      .send({ tiers: [{ minQty: 0, unitPrice: 100 }] });

    expect(res.status).toBe(400);
  });

  it('replaces the tiers for a product', async () => {
    prismaMock.product.findUnique.mockResolvedValue(baseProduct() as any);
    prismaMock.$transaction.mockResolvedValue([] as any);
    prismaMock.priceTier.findMany.mockResolvedValue([{ id: 't1', productId: 'p1', minQty: 10, unitPrice: 1000 }] as any);

    const res = await request(buildApp())
      .put('/api/products/p1/price-tiers')
      .set(adminAuth)
      .send({ tiers: [{ minQty: 10, unitPrice: 1000 }] });

    expect(res.status).toBe(200);
    expect(res.body.priceTiers).toHaveLength(1);
    expect(invalidateProductCache).toHaveBeenCalled();
  });
});

describe('POST /api/products', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .send({ name: 'Test', category: 'emballage', price: 100 });

    expect(res.status).toBe(401);
  });

  it('rejects invalid payloads', async () => {
    const res = await request(buildApp())
      .post('/api/products')
      .set(adminAuth)
      .send({ name: '', category: 'emballage', price: 100 });

    expect(res.status).toBe(400);
  });

  it('rejects an unknown category', async () => {
    prismaMock.category.findFirst.mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/products')
      .set(adminAuth)
      .send({ name: 'Test', category: 'inconnue', price: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('introuvable');
  });

  it('creates a product with a slugified, deduplicated slug', async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: 'c1' } as any);
    prismaMock.product.findUnique.mockResolvedValue(baseProduct({ slug: 'carton-renforce' }) as any);
    prismaMock.product.create.mockResolvedValue(baseProduct({ name: 'Carton Renforcé' }) as any);

    const res = await request(buildApp())
      .post('/api/products')
      .set(adminAuth)
      .send({ name: 'Carton Renforcé', category: 'emballage', price: 100, stockQuantity: 2 });

    expect(res.status).toBe(201);
    const createCall = prismaMock.product.create.mock.calls[0][0] as any;
    expect(createCall.data.slug).toMatch(/^carton-renforce-\d+$/);
    expect(invalidateProductCache).toHaveBeenCalled();
  });

  it('persists moq, unit, estimatedWeightKg and freeShipping', async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: 'c1' } as any);
    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.product.create.mockResolvedValue(baseProduct() as any);

    await request(buildApp())
      .post('/api/products')
      .set(adminAuth)
      .send({
        name: 'Palette', category: 'emballage', price: 30000, stockQuantity: 5,
        moq: 10, unit: 'carton', estimatedWeightKg: 1.8, freeShipping: true,
      });

    const createCall = prismaMock.product.create.mock.calls[0][0] as any;
    expect(createCall.data.moq).toBe(10);
    expect(createCall.data.unit).toBe('carton');
    expect(createCall.data.estimatedWeightKg).toBe(1.8);
    expect(createCall.data.freeShipping).toBe(true);
  });

  it('rejects an invalid moq', async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: 'c1' } as any);

    const res = await request(buildApp())
      .post('/api/products')
      .set(adminAuth)
      .send({ name: 'X', category: 'emballage', price: 100, moq: 0 });

    expect(res.status).toBe(400);
    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range estimatedWeightKg (> 500 kg)', async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: 'c1' } as any);

    const res = await request(buildApp())
      .post('/api/products')
      .set(adminAuth)
      .send({ name: 'X', category: 'emballage', price: 100, estimatedWeightKg: 501 });

    expect(res.status).toBe(400);
    expect(prismaMock.product.create).not.toHaveBeenCalled();
  });

  it('persists a valid availableFrom date and rejects an invalid one', async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: 'c1' } as any);
    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.product.create.mockResolvedValue(baseProduct() as any);

    const ok = await request(buildApp())
      .post('/api/products')
      .set(adminAuth)
      .send({ name: 'Précommande', category: 'emballage', price: 10000, availableFrom: '2026-12-01' });
    expect(ok.status).toBe(201);
    const createCall = prismaMock.product.create.mock.calls[0][0] as any;
    expect(createCall.data.availableFrom).toBeInstanceOf(Date);
    expect((createCall.data.availableFrom as Date).toISOString()).toBe('2026-12-01T00:00:00.000Z');

    const bad = await request(buildApp())
      .post('/api/products')
      .set(adminAuth)
      .send({ name: 'X', category: 'emballage', price: 10000, availableFrom: 'pas-une-date' });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toBe('Date de disponibilité invalide');
  });

  it('defaults moq to 1 and unit to piece when omitted', async () => {
    prismaMock.category.findFirst.mockResolvedValue({ id: 'c1' } as any);
    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.product.create.mockResolvedValue(baseProduct() as any);

    await request(buildApp())
      .post('/api/products')
      .set(adminAuth)
      .send({ name: 'Article', category: 'emballage', price: 5000 });

    const createCall = prismaMock.product.create.mock.calls[0][0] as any;
    expect(createCall.data.moq).toBe(1);
    expect(createCall.data.unit).toBe('piece');
    expect(createCall.data.freeShipping).toBe(false);
  });
});

describe('PUT /api/products/:productId', () => {
  beforeEach(() => {
    prismaMock.category.findFirst.mockResolvedValue({ id: 'c1' } as any);
  });

  it('refuses to rename a product that is linked to orders', async () => {
    prismaMock.product.findUnique.mockResolvedValue(baseProduct({ name: 'Ancien nom' }) as any);
    prismaMock.orderItem.findFirst.mockResolvedValue({ id: 'oi1' } as any);

    const res = await request(buildApp())
      .put('/api/products/p1')
      .set(adminAuth)
      .send({ name: 'Nouveau nom', category: 'emballage', price: 20000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/nom.*commandes/i);
    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });

  it('updates moq, unit, estimatedWeightKg and freeShipping', async () => {
    prismaMock.product.findUnique.mockResolvedValue(
      baseProduct({ moq: 1, unit: 'piece', estimatedWeightKg: null, freeShipping: false }) as any
    );
    prismaMock.product.update.mockResolvedValue(baseProduct() as any);

    const res = await request(buildApp())
      .put('/api/products/p1')
      .set(adminAuth)
      .send({
        name: 'Carton emballage', category: 'emballage', price: 30000,
        moq: 20, unit: 'carton', estimatedWeightKg: 2.1, freeShipping: true,
      });

    expect(res.status).toBe(200);
    const updateCall = prismaMock.product.update.mock.calls[0][0] as any;
    expect(updateCall.data.moq).toBe(20);
    expect(updateCall.data.unit).toBe('carton');
    expect(updateCall.data.estimatedWeightKg).toBe(2.1);
    expect(updateCall.data.freeShipping).toBe(true);
  });

  it('preserves existing extras when they are omitted from the payload', async () => {
    const existingDate = new Date('2026-11-15T00:00:00.000Z');
    prismaMock.product.findUnique.mockResolvedValue(
      baseProduct({ moq: 5, unit: 'carton', estimatedWeightKg: 1.5, freeShipping: true, availableFrom: existingDate }) as any
    );
    prismaMock.product.update.mockResolvedValue(baseProduct() as any);

    await request(buildApp())
      .put('/api/products/p1')
      .set(adminAuth)
      .send({ name: 'Carton emballage', category: 'emballage', price: 31000 });

    const updateCall = prismaMock.product.update.mock.calls[0][0] as any;
    expect(updateCall.data.moq).toBe(5);
    expect(updateCall.data.unit).toBe('carton');
    expect(updateCall.data.estimatedWeightKg).toBe(1.5);
    expect(updateCall.data.freeShipping).toBe(true);
    expect(updateCall.data.availableFrom).toBe(existingDate);
  });

  it('clears availableFrom when null is sent explicitly', async () => {
    prismaMock.product.findUnique.mockResolvedValue(
      baseProduct({ availableFrom: new Date('2026-11-15T00:00:00.000Z') }) as any
    );
    prismaMock.product.update.mockResolvedValue(baseProduct() as any);

    await request(buildApp())
      .put('/api/products/p1')
      .set(adminAuth)
      .send({ name: 'Carton emballage', category: 'emballage', price: 31000, availableFrom: null });

    const updateCall = prismaMock.product.update.mock.calls[0][0] as any;
    expect(updateCall.data.availableFrom).toBeNull();
  });

  it('rejects an invalid moq on update', async () => {
    const res = await request(buildApp())
      .put('/api/products/p1')
      .set(adminAuth)
      .send({ name: 'X', category: 'emballage', price: 100, moq: -1 });

    expect(res.status).toBe(400);
    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/products/:productId', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(buildApp()).delete('/api/products/p1');
    expect(res.status).toBe(401);
  });

  it('soft-deletes a product that has existing orders', async () => {
    prismaMock.product.findUnique.mockResolvedValue(baseProduct() as any);
    prismaMock.orderItem.findFirst.mockResolvedValue({ id: 'oi1' } as any);

    const res = await request(buildApp()).delete('/api/products/p1').set(adminAuth);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('désactivé');
    expect(prismaMock.product.delete).not.toHaveBeenCalled();
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { inStock: false, stockQuantity: 0 },
    });
  });

  it('hard-deletes a product with no orders', async () => {
    prismaMock.product.findUnique.mockResolvedValue(baseProduct() as any);
    prismaMock.orderItem.findFirst.mockResolvedValue(null);

    const res = await request(buildApp()).delete('/api/products/p1').set(adminAuth);

    expect(res.status).toBe(200);
    expect(prismaMock.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('returns 404 for an unknown product', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);

    const res = await request(buildApp()).delete('/api/products/missing').set(adminAuth);

    expect(res.status).toBe(404);
  });
});
