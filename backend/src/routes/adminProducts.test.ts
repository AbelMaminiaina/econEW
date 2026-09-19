import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');
vi.mock('../lib/cache.js', () => ({
  invalidateProductCache: vi.fn().mockResolvedValue(undefined),
}));

import prisma from '../lib/prisma.js';
import { invalidateProductCache } from '../lib/cache.js';
import { signToken } from '../lib/auth.js';
import adminProductsRouter from './adminProducts.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

const adminAuth = { Authorization: `Bearer ${signToken({ userId: 'a1', role: 'platform_admin', companyId: null })}` };
const sellerAuth = { Authorization: `Bearer ${signToken({ userId: 'u1', role: 'company_admin', companyId: 'c1' })}` };

beforeEach(() => {
  mockReset(prismaMock);
  vi.mocked(invalidateProductCache).mockClear();
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/products', adminProductsRouter);
  return app;
}

describe('modération des produits vendeurs', () => {
  it('est réservée aux administrateurs', async () => {
    expect((await request(buildApp()).get('/api/admin/products')).status).toBe(401);
    expect((await request(buildApp()).get('/api/admin/products').set(sellerAuth)).status).toBe(403);
  });

  it('liste par défaut les produits en attente, uniquement ceux de vendeurs', async () => {
    prismaMock.product.findMany.mockResolvedValue([{ id: 'p1', category: 'mobiles' }] as any);

    const res = await request(buildApp()).get('/api/admin/products').set(adminAuth);

    expect(res.status).toBe(200);
    expect((prismaMock.product.findMany.mock.calls[0][0] as any).where).toEqual({
      sellerId: { not: null },
      status: 'pending',
    });
  });

  it('refuse un statut de filtre inconnu', async () => {
    const res = await request(buildApp()).get('/api/admin/products?status=nimportequoi').set(adminAuth);
    expect(res.status).toBe(400);
  });

  it('valide un produit et vide le cache', async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', sellerId: 'c1' } as any);
    prismaMock.product.update.mockResolvedValue({ id: 'p1', status: 'approved' } as any);

    const res = await request(buildApp()).patch('/api/admin/products/p1/approve').set(adminAuth);

    expect(res.status).toBe(200);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'approved', rejectionReason: null },
    });
    expect(invalidateProductCache).toHaveBeenCalled();
  });

  it('exige un motif pour refuser un produit', async () => {
    const res = await request(buildApp()).patch('/api/admin/products/p1/reject').set(adminAuth).send({});
    expect(res.status).toBe(400);
    expect(prismaMock.product.update).not.toHaveBeenCalled();
  });

  it('refuse un produit avec son motif', async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', sellerId: 'c1' } as any);
    prismaMock.product.update.mockResolvedValue({ id: 'p1', status: 'rejected' } as any);

    const res = await request(buildApp())
      .patch('/api/admin/products/p1/reject')
      .set(adminAuth)
      .send({ reason: 'Photos non conformes' });

    expect(res.status).toBe(200);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { status: 'rejected', rejectionReason: 'Photos non conformes' },
    });
  });

  it('ne modère pas un produit de la plateforme (sans vendeur)', async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: 'p1', sellerId: null } as any);

    const res = await request(buildApp()).patch('/api/admin/products/p1/approve').set(adminAuth);

    expect(res.status).toBe(404);
  });
});
