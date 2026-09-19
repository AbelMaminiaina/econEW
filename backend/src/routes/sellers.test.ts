import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');

import prisma from '../lib/prisma.js';
import sellersRouter from './sellers.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sellers', sellersRouter);
  return app;
}

const company = {
  id: 'c1',
  name: 'Grossiste Demo',
  legalName: 'Grossiste Demo SARL',
  createdAt: new Date('2026-03-01'),
  users: [{ firstName: 'Jean', lastName: 'Rakoto' }],
  _count: { products: 4 },
  // Données privées : elles ne doivent jamais sortir
  contactEmail: 'prive@example.mg',
  contactPhone: '034 00 000 00',
  taxId: 'NIF-123',
};

describe('GET /api/sellers', () => {
  it('liste les vendeurs approuvés ayant des produits publiés, sans donnée privée', async () => {
    prismaMock.company.findMany.mockResolvedValue([company] as any);

    const res = await request(buildApp()).get('/api/sellers');

    expect(res.status).toBe(200);
    expect(res.body.sellers).toEqual([
      {
        id: 'c1',
        name: 'Grossiste Demo',
        legalName: 'Grossiste Demo SARL',
        memberSince: '2026-03-01T00:00:00.000Z',
        productCount: 4,
        contactPerson: 'Jean R.',
      },
    ]);
    const text = JSON.stringify(res.body);
    expect(text).not.toContain('prive@example.mg');
    expect(text).not.toContain('034 00');
    expect(text).not.toContain('NIF-123');

    const where = (prismaMock.company.findMany.mock.calls[0][0] as any).where;
    expect(where.status).toBe('approved');
    expect(where.products).toEqual({ some: { status: 'approved', isActive: true } });
  });

  it('masque la raison sociale quand elle est identique au nom', async () => {
    prismaMock.company.findMany.mockResolvedValue([{ ...company, legalName: 'Grossiste Demo' }] as any);

    const res = await request(buildApp()).get('/api/sellers');

    expect(res.body.sellers[0].legalName).toBeNull();
  });
});

describe('GET /api/sellers/:id', () => {
  it('renvoie le profil public d’un vendeur', async () => {
    prismaMock.company.findFirst.mockResolvedValue(company as any);

    const res = await request(buildApp()).get('/api/sellers/c1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'c1', name: 'Grossiste Demo', contactPerson: 'Jean R.', productCount: 4 });
    expect(JSON.stringify(res.body)).not.toContain('prive@example.mg');
  });

  it('répond 404 pour un vendeur inconnu, non approuvé ou sans produit publié', async () => {
    prismaMock.company.findFirst.mockResolvedValue(null);

    const res = await request(buildApp()).get('/api/sellers/inconnu');

    expect(res.status).toBe(404);
    const where = (prismaMock.company.findFirst.mock.calls[0][0] as any).where;
    expect(where).toMatchObject({ id: 'inconnu', status: 'approved' });
  });

  it('tolère une entreprise sans utilisateur', async () => {
    prismaMock.company.findFirst.mockResolvedValue({ ...company, users: [] } as any);

    const res = await request(buildApp()).get('/api/sellers/c1');

    expect(res.body.contactPerson).toBeNull();
  });
});
