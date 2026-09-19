import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');
vi.mock('../services/emailService.js', () => ({
  sendCompanyApprovedEmail: vi.fn().mockResolvedValue(true),
  sendCompanyRejectedEmail: vi.fn().mockResolvedValue(true),
}));

import prisma from '../lib/prisma.js';
import { signToken } from '../lib/auth.js';
import companiesRouter from './companies.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/companies', companiesRouter);
  return app;
}

const adminToken = signToken({ userId: 'admin1', role: 'platform_admin', companyId: null });
const buyerToken = signToken({ userId: 'buyer1', role: 'buyer', companyId: 'c1' });

describe('GET /api/companies', () => {
  it('rejects a non-admin user', async () => {
    const res = await request(buildApp())
      .get('/api/companies')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(403);
  });

  it('lists companies for an admin', async () => {
    prismaMock.company.findMany.mockResolvedValue([{ id: 'c1', status: 'pending', users: [] }] as any);

    const res = await request(buildApp())
      .get('/api/companies')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });
});

describe('GET /api/companies/:id', () => {
  it('allows the company itself to read its own record', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 'c1', users: [] } as any);

    const res = await request(buildApp())
      .get('/api/companies/c1')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
  });

  it('rejects a user from a different company', async () => {
    const res = await request(buildApp())
      .get('/api/companies/some-other-company')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/companies/:id/approve', () => {
  it('rejects a non-admin user', async () => {
    const res = await request(buildApp())
      .patch('/api/companies/c1/approve')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ paymentTerms: 'net_30' });

    expect(res.status).toBe(403);
  });

  it('approves a company and sets payment terms', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 'c1', paymentTerms: null, creditLimit: null } as any);
    prismaMock.company.update.mockResolvedValue({
      id: 'c1', name: 'Grossiste Test', status: 'approved', paymentTerms: 'net_60', contactEmail: 'a@b.com',
    } as any);

    const res = await request(buildApp())
      .patch('/api/companies/c1/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentTerms: 'net_60' });

    expect(res.status).toBe(200);
    const updateArgs = prismaMock.company.update.mock.calls[0][0] as any;
    expect(updateArgs.data.status).toBe('approved');
    expect(updateArgs.data.paymentTerms).toBe('net_60');
  });

  it('rejects invalid payment terms', async () => {
    const res = await request(buildApp())
      .patch('/api/companies/c1/approve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentTerms: 'net_90' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/companies/:id/reject', () => {
  it('rejects with a reason', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 'c1' } as any);
    prismaMock.company.update.mockResolvedValue({
      id: 'c1', name: 'Grossiste Test', status: 'rejected', contactEmail: 'a@b.com', rejectionReason: 'Documents manquants',
    } as any);

    const res = await request(buildApp())
      .patch('/api/companies/c1/reject')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Documents manquants' });

    expect(res.status).toBe(200);
    const updateArgs = prismaMock.company.update.mock.calls[0][0] as any;
    expect(updateArgs.data.status).toBe('rejected');
    expect(updateArgs.data.rejectionReason).toBe('Documents manquants');
  });
});
