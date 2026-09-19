import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { vi } from 'vitest';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');

import prisma from '../lib/prisma.js';
import { hashPassword, signToken } from '../lib/auth.js';
import authRouter from './auth.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

const validRegistration = {
  companyName: 'Grossiste Test SARL',
  taxId: 'TAX-001',
  contactEmail: 'contact@grossiste-test.example',
  user: {
    email: 'admin@grossiste-test.example',
    password: 'password123',
    firstName: 'Jean',
    lastName: 'Dupont',
  },
};

describe('POST /api/auth/register-company', () => {
  it('rejects an invalid payload', async () => {
    const res = await request(buildApp()).post('/api/auth/register-company').send({});
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate tax id', async () => {
    prismaMock.company.findUnique.mockResolvedValue({ id: 'existing' } as any);
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(buildApp()).post('/api/auth/register-company').send(validRegistration);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/numéro fiscal/);
  });

  it('rejects a duplicate user email', async () => {
    prismaMock.company.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' } as any);

    const res = await request(buildApp()).post('/api/auth/register-company').send(validRegistration);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/e-mail/);
  });

  it('creates a pending company with its first company_admin user', async () => {
    prismaMock.company.findUnique.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.company.create.mockResolvedValue({ id: 'c1', users: [] } as any);

    const res = await request(buildApp()).post('/api/auth/register-company').send(validRegistration);

    expect(res.status).toBe(201);
    const createArgs = prismaMock.company.create.mock.calls[0][0] as any;
    expect(createArgs.data.status).toBe('pending');
    expect(createArgs.data.users.create.role).toBe('company_admin');
    expect(createArgs.data.users.create.passwordHash).not.toBe('password123');
  });
});

describe('POST /api/auth/register (particulier)', () => {
  const validCustomer = {
    email: 'client@example.com',
    password: 'password123',
    firstName: 'Marie',
    lastName: 'Rakoto',
  };

  it('rejects an invalid payload', async () => {
    const res = await request(buildApp()).post('/api/auth/register').send({ email: 'x' });
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate email', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' } as any);

    const res = await request(buildApp()).post('/api/auth/register').send(validCustomer);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/e-mail/);
  });

  it('creates a customer user with no company, hashed password and immediate access', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'u1' } as any);

    const res = await request(buildApp()).post('/api/auth/register').send(validCustomer);

    expect(res.status).toBe(201);
    const createArgs = prismaMock.user.create.mock.calls[0][0] as any;
    expect(createArgs.data.role).toBe('customer');
    expect(createArgs.data.companyId).toBeUndefined();
    expect(createArgs.data.passwordHash).not.toBe('password123');
    expect(prismaMock.company.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  it('rejects unknown credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' });

    expect(res.status).toBe(401);
  });

  it('rejects an incorrect password', async () => {
    const passwordHash = await hashPassword('correct-password');
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', passwordHash, role: 'buyer', companyId: null, company: null,
    } as any);

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
  });

  it('returns a token and user/company info on success', async () => {
    const passwordHash = await hashPassword('correct-password');
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash,
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'company_admin',
      companyId: 'c1',
      company: { id: 'c1', name: 'Grossiste Test', status: 'approved', paymentTerms: 'net_30' },
    } as any);

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: 'a@b.com', password: 'correct-password' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.body.company.status).toBe('approved');
  });
});

describe('GET /api/auth/me', () => {
  it('rejects an unauthenticated request', async () => {
    const res = await request(buildApp()).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user and company', async () => {
    const token = signToken({ userId: 'u1', role: 'buyer', companyId: 'c1' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'buyer',
      company: { id: 'c1', name: 'Grossiste Test', status: 'approved', paymentTerms: 'net_30', creditLimit: null },
    } as any);

    const res = await request(buildApp())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.body.company.name).toBe('Grossiste Test');
  });
});
