import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');
vi.mock('./emailService.js', () => ({
  sendPaymentConfirmedEmail: vi.fn().mockResolvedValue(true),
}));

import prisma from '../lib/prisma.js';
import { sendPaymentConfirmedEmail } from './emailService.js';
import { createMockMvola } from '../testing/mockMvolaServer.js';
import { MvolaClient, getMvolaConfig } from '../lib/mvola.js';
import {
  PaymentHttpError,
  handleOperatorCallback,
  initiateAutoPayment,
  reconcileAttempt,
  reconcilePendingAttempts,
} from './mobileMoneyPayments.js';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const mock = createMockMvola({ consumerKey: 'test-key', consumerSecret: 'test-secret' });
const originalEnv = { ...process.env };

beforeAll(async () => {
  const { url } = await mock.listen();
  process.env.MVOLA_CONSUMER_KEY = 'test-key';
  process.env.MVOLA_CONSUMER_SECRET = 'test-secret';
  process.env.MVOLA_MERCHANT_NUMBER = '034 00 000 00';
  process.env.MVOLA_API_BASE_URL = url;
});
afterAll(async () => {
  await mock.close();
  process.env = originalEnv;
});

// Base de données simulée pour les tentatives de paiement (se comporte comme la vraie : réclamation conditionnelle)
let attempt: any;
const orderUpdates: any[] = [];
const orderUpdateManys: any[] = [];

beforeEach(() => {
  mockReset(prismaMock);
  mock.requests.length = 0;
  mock.transactions.clear();
  vi.mocked(sendPaymentConfirmedEmail).mockClear();
  orderUpdates.length = 0;
  orderUpdateManys.length = 0;
  attempt = undefined;

  prismaMock.paymentAttempt.findUnique.mockImplementation((async () => (attempt ? { ...attempt } : null)) as any);
  prismaMock.paymentAttempt.updateMany.mockImplementation((async ({ where, data }: any) => {
    if (attempt && attempt.id === where.id && (!where.status || attempt.status === where.status)) {
      attempt = { ...attempt, ...data };
      return { count: 1 };
    }
    return { count: 0 };
  }) as any);
  prismaMock.paymentAttempt.update.mockImplementation((async ({ data }: any) => {
    attempt = { ...attempt, ...data };
    return { ...attempt };
  }) as any);
  prismaMock.paymentAttempt.create.mockImplementation((async ({ data }: any) => {
    attempt = { id: 'att-1', serverCorrelationId: null, transactionId: null, providerStatus: null, failureReason: null, createdAt: new Date(), ...data };
    return { ...attempt };
  }) as any);
  prismaMock.paymentAttempt.findFirst.mockResolvedValue(null);
  prismaMock.paymentAttempt.count.mockResolvedValue(0);
  prismaMock.order.update.mockImplementation((async (args: any) => { orderUpdates.push(args); return {}; }) as any);
  prismaMock.order.updateMany.mockImplementation((async (args: any) => { orderUpdateManys.push(args); return { count: 1 }; }) as any);
});

const order = (overrides: Partial<any> = {}) => ({
  id: 'o1',
  orderNumber: 'ORD-1',
  checkoutGroup: 'g1',
  status: 'pending',
  paymentStatus: 'awaiting',
  paymentMethod: 'mvola',
  total: 100_000,
  subtotal: 100_000,
  sellerId: null,
  stockReserved: true,
  guestName: 'Rakoto Jean',
  guestEmail: 'jean@example.mg',
  guestPhone: '034 11 111 11',
  company: null,
  user: null,
  ...overrides,
});
const group = [order(), order({ id: 'o2', orderNumber: 'ORD-2', total: 50_000, subtotal: 50_000 })];

// Crée une vraie transaction chez le faux MVola et la « tentative » correspondante en base
async function startedAttempt(payer = '0343500003', extra: Partial<any> = {}) {
  const config = getMvolaConfig()!;
  const client = new MvolaClient(config);
  const started = await client.initiate({ amount: 150_000, reference: 'att-1', description: 'Commande ORD-1', payerNumber: payer });
  attempt = {
    id: 'att-1',
    provider: 'mvola',
    orderId: 'o1',
    checkoutGroup: 'g1',
    amount: 150_000,
    payerPhone: payer,
    status: 'pending',
    serverCorrelationId: started.serverCorrelationId,
    transactionId: started.objectReference,
    providerStatus: 'pending',
    failureReason: null,
    createdAt: new Date(),
    ...extra,
  };
  prismaMock.order.findMany.mockResolvedValue(group as any);
  return started;
}

describe('initiateAutoPayment', () => {
  const anchor = group[0] as any;

  it('envoie la demande à MVola pour le total du panier et met les commandes en attente de confirmation', async () => {
    const { attempt: created, reused } = await initiateAutoPayment({ group: group as any, anchor, payerPhone: '034 35 000 03' });

    expect(reused).toBe(false);
    expect(created).toMatchObject({ amount: 150_000, payerPhone: '0343500003', status: 'pending' });
    expect(created.serverCorrelationId).toBeTruthy();

    const request = mock.requests.find((r) => r.method === 'POST' && r.path.endsWith('/merchantpay/1.0.0/'))!;
    expect(request.body).toMatchObject({ amount: '150000', currency: 'Ar', requestingOrganisationTransactionReference: 'att-1' });
    expect(request.body.debitParty).toEqual([{ key: 'msisdn', value: '0343500003' }]);
    expect(request.body.creditParty).toEqual([{ key: 'msisdn', value: '0340000000' }]);

    const submitted = orderUpdateManys.find((u) => u.data.paymentStatus === 'submitted');
    expect(submitted.where.id.in).toEqual(['o1', 'o2']);
    expect(submitted.data).toMatchObject({ paymentReference: 'MVOLA:att-1', paymentPayerPhone: '0343500003', paymentRejectionReason: null });
  });

  it('ne compte que les commandes encore à payer (ni payées, ni annulées)', async () => {
    const mixed = [order({ paymentStatus: 'paid' }), order({ id: 'o2', orderNumber: 'ORD-2', total: 50_000 }), order({ id: 'o3', status: 'cancelled', total: 999_999 })];

    const { attempt: created } = await initiateAutoPayment({ group: mixed as any, anchor: mixed[1] as any, payerPhone: '0343500003' });

    expect(created.amount).toBe(50_000);
  });

  it.each([
    ['numéro Orange Money', '032 12 345 67'],
    ['numéro invalide', '12'],
    ['numéro étranger', '+33 6 12 34 56 78'],
  ])('refuse un numéro qui n’est pas MVola (%s) sans appeler MVola', async (_label, phone) => {
    await expect(initiateAutoPayment({ group: group as any, anchor, payerPhone: phone })).rejects.toMatchObject({ status: 400 });
    expect(mock.requests).toHaveLength(0);
    expect(prismaMock.paymentAttempt.create).not.toHaveBeenCalled();
  });

  it('refuse (503) une commande dont l’opérateur n’est pas configuré pour l’API', async () => {
    const orange = order({ paymentMethod: 'orange_money' });
    await expect(initiateAutoPayment({ group: [orange] as any, anchor: orange as any, payerPhone: '0343500003' })).rejects.toMatchObject({ status: 503 });
  });

  it('refuse une commande déjà payée ou annulée (409)', async () => {
    const paid = order({ paymentStatus: 'paid' });
    await expect(initiateAutoPayment({ group: [paid] as any, anchor: paid as any, payerPhone: '0343500003' })).rejects.toMatchObject({ status: 409 });
  });

  it('reprend la demande déjà en cours au lieu d’envoyer une seconde notification au téléphone', async () => {
    await startedAttempt();
    mock.requests.length = 0;
    prismaMock.paymentAttempt.findFirst.mockResolvedValue({ ...attempt } as any);

    const { attempt: result, reused } = await initiateAutoPayment({ group: group as any, anchor, payerPhone: '0343500003' });

    expect(reused).toBe(true);
    expect(result.id).toBe('att-1');
    expect(mock.requests.some((r) => r.method === 'POST' && r.path.endsWith('/merchantpay/1.0.0/'))).toBe(false);
  });

  it.each([
    ['par commande (5 par heure)', 5, 0],
    ['par numéro de téléphone (3 par heure)', 0, 3],
  ])('limite le harcèlement d’un téléphone : %s', async (_label, byOrder, byPhone) => {
    prismaMock.paymentAttempt.count.mockResolvedValueOnce(byOrder).mockResolvedValueOnce(byPhone);

    await expect(initiateAutoPayment({ group: group as any, anchor, payerPhone: '0343500003' })).rejects.toMatchObject({ status: 429 });
    expect(mock.requests).toHaveLength(0);
  });

  it('signale une panne de MVola (503), abandonne la tentative et laisse les commandes à payer', async () => {
    const error = await initiateAutoPayment({ group: group as any, anchor, payerPhone: '0343500007' }).catch((e) => e);

    expect(error).toBeInstanceOf(PaymentHttpError);
    expect(error.status).toBe(503);
    expect(error.message).toContain('payez manuellement');
    expect(attempt.status).toBe('failed');
    expect(orderUpdateManys.some((u) => u.data.paymentStatus === 'submitted')).toBe(false);
  });

  it('signale un refus de MVola (502) sans laisser fuiter le détail technique au client', async () => {
    const failing = new MvolaClient({ ...getMvolaConfig()!, consumerSecret: 'mauvais' });
    expect(failing).toBeDefined();
    process.env.MVOLA_CONSUMER_SECRET = 'mauvais';
    const error = await initiateAutoPayment({ group: group as any, anchor, payerPhone: '0343500003' }).catch((e) => e);
    process.env.MVOLA_CONSUMER_SECRET = 'test-secret';

    expect(error.status).toBe(502);
    expect(error.message).not.toMatch(/401|token|invalid_client/i);
    expect(attempt.status).toBe('failed');
  });

  it('refuse quand MVola n’est pas configuré (503)', async () => {
    const key = process.env.MVOLA_CONSUMER_KEY;
    delete process.env.MVOLA_CONSUMER_KEY;
    await expect(initiateAutoPayment({ group: group as any, anchor, payerPhone: '0343500003' })).rejects.toMatchObject({ status: 503 });
    process.env.MVOLA_CONSUMER_KEY = key;
  });
});

describe('reconcileAttempt', () => {
  it('reste en attente tant que le client n’a pas confirmé', async () => {
    await startedAttempt();

    const result = await reconcileAttempt('att-1');

    expect(result?.status).toBe('pending');
    expect(orderUpdates).toHaveLength(0);
  });

  it('valide le paiement confirmé par MVola : commandes payées, démarrées, référence de transaction, e-mail', async () => {
    const started = await startedAttempt();
    mock.resolveTransaction(started.serverCorrelationId, 'completed');

    const result = await reconcileAttempt('att-1');

    expect(result?.status).toBe('completed');
    expect(orderUpdates).toHaveLength(2);
    for (const update of orderUpdates) {
      expect(update.data).toMatchObject({
        paymentStatus: 'paid',
        paymentReference: `MVOLA:${started.objectReference}`,
        paymentPayerPhone: '0343500003',
        status: 'processing', // stock déjà réservé : la commande démarre
      });
    }
    expect(sendPaymentConfirmedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ orderNumbers: ['ORD-1', 'ORD-2'], totalAmount: 150_000, contactEmail: 'jean@example.mg' })
    );
  });

  it('fige la commission des commandes de vendeur, comme une confirmation manuelle', async () => {
    const started = await startedAttempt();
    prismaMock.order.findMany.mockResolvedValue([order({ sellerId: 's1', subtotal: 100_000, total: 103_000 }), order({ id: 'o2', orderNumber: 'ORD-2', total: 47_000, subtotal: 47_000 })] as any);
    prismaMock.company.findMany.mockResolvedValue([{ id: 's1', commissionRate: 5 }] as any);
    attempt.amount = 150_000;
    mock.resolveTransaction(started.serverCorrelationId, 'completed');

    await reconcileAttempt('att-1');

    expect(orderUpdates[0].data).toMatchObject({ commissionRate: 5, commissionAmount: 5_000, sellerAmount: 98_000 });
    expect(orderUpdates[1].data).not.toHaveProperty('commissionAmount');
  });

  it('remet les commandes à payer quand le client refuse (le client peut réessayer, la date limite n’est pas prolongée)', async () => {
    const started = await startedAttempt('0343500004');
    mock.resolveTransaction(started.serverCorrelationId, 'failed');

    const result = await reconcileAttempt('att-1');

    expect(result?.status).toBe('failed');
    expect(result?.failureReason).toContain('refusé');
    const revert = orderUpdateManys.find((u) => u.data.paymentStatus === 'awaiting');
    expect(revert.where).toMatchObject({ checkoutGroup: 'g1', paymentStatus: 'submitted', paymentReference: { startsWith: 'MVOLA:' } });
    expect(revert.data).toMatchObject({ paymentReference: null, paymentPayerPhone: null });
    expect(orderUpdates).toHaveLength(0);
  });

  it('ne valide PAS quand le montant reçu diffère : statut « review », commandes non payées', async () => {
    const started = await startedAttempt('0343500006'); // le faux MVola renvoie 1 000 Ar de moins dans les détails
    mock.resolveTransaction(started.serverCorrelationId, 'completed');

    const result = await reconcileAttempt('att-1');

    expect(result?.status).toBe('review');
    expect(result?.failureReason).toContain('Montant reçu 149000 Ar au lieu de 150000 Ar');
    expect(orderUpdates).toHaveLength(0);
    expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled();
  });

  it('ne valide PAS quand le total du panier a changé entre la demande et la confirmation', async () => {
    const started = await startedAttempt();
    prismaMock.order.findMany.mockResolvedValue([order(), order({ id: 'o2', orderNumber: 'ORD-2', total: 50_000, status: 'cancelled' })] as any); // ORD-2 annulée
    mock.resolveTransaction(started.serverCorrelationId, 'completed');

    const result = await reconcileAttempt('att-1');

    expect(result?.status).toBe('review');
    expect(result?.failureReason).toContain('total du panier a changé');
    expect(orderUpdates).toHaveLength(0);
  });

  it('ne règle qu’une seule fois quand deux vérifications se croisent (réclamation conditionnelle)', async () => {
    const started = await startedAttempt();
    mock.resolveTransaction(started.serverCorrelationId, 'completed');

    await Promise.all([reconcileAttempt('att-1'), reconcileAttempt('att-1'), reconcileAttempt('att-1')]);

    expect(orderUpdates).toHaveLength(2); // 2 commandes, une seule fois
    expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1);
  });

  it('ne touche à rien quand les commandes ont déjà été payées (confirmées à la main entre-temps)', async () => {
    const started = await startedAttempt();
    prismaMock.order.findMany.mockResolvedValue(group.map((o) => ({ ...o, paymentStatus: 'paid' })) as any);
    mock.resolveTransaction(started.serverCorrelationId, 'completed');

    const result = await reconcileAttempt('att-1');

    expect(result?.status).toBe('completed');
    expect(orderUpdates).toHaveLength(0);
    expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled();
  });

  it('abandonne une demande jamais confirmée au bout de 15 minutes', async () => {
    await startedAttempt('0343500005', { createdAt: new Date(Date.now() - 16 * 60 * 1000) });

    const result = await reconcileAttempt('att-1');

    expect(result?.status).toBe('failed');
    expect(result?.failureReason).toContain('Délai de confirmation dépassé');
  });

  it('ne conclut rien quand MVola est injoignable : la tentative reste en attente', async () => {
    await startedAttempt();
    const base = process.env.MVOLA_API_BASE_URL;
    process.env.MVOLA_API_BASE_URL = 'http://127.0.0.1:1';

    const result = await reconcileAttempt('att-1');
    process.env.MVOLA_API_BASE_URL = base;

    expect(result?.status).toBe('pending');
    expect(orderUpdates).toHaveLength(0);
  });

  it('valide sur le statut « completed » même si le détail de la transaction est indisponible', async () => {
    const started = await startedAttempt();
    attempt.transactionId = 'inconnu-chez-mvola'; // le détail renverra 404
    mock.resolveTransaction(started.serverCorrelationId, 'completed');
    const status = await new MvolaClient(getMvolaConfig()!).getStatus(started.serverCorrelationId);
    expect(status.objectReference).toBeTruthy(); // le statut renvoie la vraie référence, qui prime

    const result = await reconcileAttempt('att-1');

    expect(result?.status).toBe('completed');
    expect(orderUpdates).toHaveLength(2);
  });

  it('ignore une tentative déjà terminée ou inconnue', async () => {
    attempt = undefined;
    expect(await reconcileAttempt('nope')).toBeNull();

    await startedAttempt();
    attempt.status = 'completed';
    mock.requests.length = 0;
    expect((await reconcileAttempt('att-1'))?.status).toBe('completed');
    expect(mock.requests).toHaveLength(0);
  });
});

describe('handleOperatorCallback', () => {
  it('retrouve la tentative par l’identifiant de suivi et vérifie auprès de MVola (sans croire le message)', async () => {
    const started = await startedAttempt();
    prismaMock.paymentAttempt.findFirst.mockResolvedValue({ ...attempt } as any);
    // Le message de rappel prétend « completed » alors que le client n'a rien confirmé : il doit être ignoré
    const found = await handleOperatorCallback('mvola', { serverCorrelationId: started.serverCorrelationId, transactionStatus: 'completed' });

    expect(found).toBe(true);
    expect(attempt.status).toBe('pending'); // MVola, interrogé, dit toujours « pending »
    expect(orderUpdates).toHaveLength(0);
    expect((prismaMock.paymentAttempt.findFirst.mock.calls[0][0] as any).where.OR).toEqual([{ serverCorrelationId: started.serverCorrelationId }]);
  });

  it('règle le paiement quand MVola confirme réellement', async () => {
    const started = await startedAttempt();
    prismaMock.paymentAttempt.findFirst.mockResolvedValue({ ...attempt } as any);
    mock.resolveTransaction(started.serverCorrelationId, 'completed');

    await handleOperatorCallback('mvola', { requestingOrganisationTransactionReference: 'att-1', objectReference: started.objectReference });

    expect(attempt.status).toBe('completed');
    expect(orderUpdates).toHaveLength(2);
  });

  it.each([[null], [undefined], ['texte'], [{}], [{ serverCorrelationId: 123 }], [{ serverCorrelationId: 'x'.repeat(500) }]])(
    'ignore un message inexploitable (%j) sans interroger la base',
    async (body) => {
      expect(await handleOperatorCallback('mvola', body)).toBe(false);
      expect(prismaMock.paymentAttempt.findFirst).not.toHaveBeenCalled();
    }
  );

  it('répond « false » pour une tentative inconnue', async () => {
    prismaMock.paymentAttempt.findFirst.mockResolvedValue(null);
    expect(await handleOperatorCallback('mvola', { serverCorrelationId: 'inconnue' })).toBe(false);
  });
});

describe('reconcilePendingAttempts (tâche de fond)', () => {
  it('vérifie les demandes en attente même si le client a fermé la page', async () => {
    const started = await startedAttempt('0343500003', { createdAt: new Date(Date.now() - 60_000) });
    mock.resolveTransaction(started.serverCorrelationId, 'completed');
    prismaMock.paymentAttempt.findMany.mockResolvedValueOnce([{ ...attempt }] as any).mockResolvedValueOnce([]);

    const checked = await reconcilePendingAttempts();

    expect(checked).toBe(1);
    expect(attempt.status).toBe('completed');
  });

  it('signale pour vérification un paiement confirmé APRÈS l’abandon de la demande', async () => {
    const started = await startedAttempt('0343500003', { status: 'failed', failureReason: 'Délai de confirmation dépassé (15 min)' });
    mock.resolveTransaction(started.serverCorrelationId, 'completed');
    prismaMock.paymentAttempt.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...attempt }] as any);

    await reconcilePendingAttempts();

    expect(attempt.status).toBe('review');
    expect(attempt.failureReason).toContain('APRÈS');
    expect(orderUpdates).toHaveLength(0); // jamais de validation automatique dans ce cas
  });

  it('ne fait rien quand MVola n’est pas configuré', async () => {
    const key = process.env.MVOLA_CONSUMER_KEY;
    delete process.env.MVOLA_CONSUMER_KEY;

    expect(await reconcilePendingAttempts()).toBe(0);
    expect(prismaMock.paymentAttempt.findMany).not.toHaveBeenCalled();
    process.env.MVOLA_CONSUMER_KEY = key;
  });
});
