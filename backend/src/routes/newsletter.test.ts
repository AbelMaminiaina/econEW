import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');

import prisma from '../lib/prisma.js';
import newsletterRouter from './newsletter.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/newsletter', newsletterRouter);
  return app;
}

describe('POST /api/newsletter', () => {
  it('rejects an invalid email', async () => {
    const res = await request(buildApp()).post('/api/newsletter').send({ email: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email invalide');
  });

  it('creates a new subscription', async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue(null);
    prismaMock.newsletterSubscriber.create.mockResolvedValue({} as any);

    const res = await request(buildApp()).post('/api/newsletter').send({ email: 'a@b.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prismaMock.newsletterSubscriber.create).toHaveBeenCalledWith({ data: { email: 'a@b.com' } });
  });

  it('reports an already-active subscriber without touching the database', async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue({ email: 'a@b.com', isActive: true } as any);

    const res = await request(buildApp()).post('/api/newsletter').send({ email: 'a@b.com' });

    expect(res.status).toBe(200);
    expect(res.body.alreadySubscribed).toBe(true);
    expect(prismaMock.newsletterSubscriber.update).not.toHaveBeenCalled();
    expect(prismaMock.newsletterSubscriber.create).not.toHaveBeenCalled();
  });

  it('reactivates an inactive subscriber', async () => {
    prismaMock.newsletterSubscriber.findUnique.mockResolvedValue({ email: 'a@b.com', isActive: false } as any);
    prismaMock.newsletterSubscriber.update.mockResolvedValue({} as any);

    const res = await request(buildApp()).post('/api/newsletter').send({ email: 'a@b.com' });

    expect(res.status).toBe(200);
    expect(prismaMock.newsletterSubscriber.update).toHaveBeenCalledWith({
      where: { email: 'a@b.com' },
      data: { isActive: true },
    });
  });
});

describe('GET /api/newsletter', () => {
  it('returns the count of active subscribers', async () => {
    prismaMock.newsletterSubscriber.count.mockResolvedValue(42);

    const res = await request(buildApp()).get('/api/newsletter');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(42);
    expect(prismaMock.newsletterSubscriber.count).toHaveBeenCalledWith({ where: { isActive: true } });
  });
});

describe('DELETE /api/newsletter/:email', () => {
  it('deactivates the subscriber', async () => {
    prismaMock.newsletterSubscriber.update.mockResolvedValue({} as any);

    const res = await request(buildApp()).delete('/api/newsletter/a@b.com');

    expect(res.status).toBe(200);
    expect(prismaMock.newsletterSubscriber.update).toHaveBeenCalledWith({
      where: { email: 'a@b.com' },
      data: { isActive: false },
    });
  });
});
