import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');

import prisma from '../lib/prisma.js';
import contactRouter from './contact.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/contact', contactRouter);
  return app;
}

const validPayload = {
  name: 'Jean Dupont',
  email: 'jean@example.com',
  subject: 'Question',
  message: 'Bonjour, ceci est un message de test suffisamment long.',
  consent: true,
};

describe('POST /api/contact', () => {
  it('saves a valid message', async () => {
    prismaMock.contactMessage.create.mockResolvedValue({ id: 'msg1' } as any);

    const res = await request(buildApp()).post('/api/contact').send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.id).toBe('msg1');
  });

  it('rejects a missing consent', async () => {
    const res = await request(buildApp())
      .post('/api/contact')
      .send({ ...validPayload, consent: false });

    expect(res.status).toBe(400);
    expect(prismaMock.contactMessage.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    const res = await request(buildApp())
      .post('/api/contact')
      .send({ ...validPayload, email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('rejects a message shorter than 10 characters', async () => {
    const res = await request(buildApp())
      .post('/api/contact')
      .send({ ...validPayload, message: 'short' });

    expect(res.status).toBe(400);
  });

  it('returns 500 on unexpected errors', async () => {
    prismaMock.contactMessage.create.mockRejectedValue(new Error('db down'));

    const res = await request(buildApp()).post('/api/contact').send(validPayload);

    expect(res.status).toBe(500);
  });
});

describe('PATCH /api/contact/:id/read', () => {
  it('marks a message as read', async () => {
    prismaMock.contactMessage.update.mockResolvedValue({} as any);

    const res = await request(buildApp()).patch('/api/contact/msg1/read');

    expect(res.status).toBe(200);
    expect(prismaMock.contactMessage.update).toHaveBeenCalledWith({
      where: { id: 'msg1' },
      data: { isRead: true },
    });
  });
});
