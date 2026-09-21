import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { mockReset, type DeepMockProxy } from 'vitest-mock-extended';
import type { PrismaClient } from '@prisma/client';

vi.mock('../lib/prisma.js');
vi.mock('./emailService.js', () => ({
  sendPaymentConfirmedEmail: vi.fn().mockResolvedValue(true),
}));

import prisma from '../lib/prisma.js';
import { sendPaymentConfirmedEmail } from './emailService.js';
import { createMockOrange } from '../testing/mockOrangeServer.js';
import { createMockAirtel } from '../testing/mockAirtelServer.js';
import { getOrangeClient } from '../lib/orangeMoney.js';
import { getAirtelClient } from '../lib/airtelMoney.js';
import { compactId } from '../lib/operators.js';
import { handleOperatorCallback, initiateAutoPayment, reconcileAttempt, reconcilePendingAttempts } from './mobileMoneyPayments.js';

// Orange Money (redirection vers la page d'Orange) et Airtel Money (demande sur le téléphone) : mêmes garanties
// que MVola, testées contre leurs faux serveurs.

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const orangeMock = createMockOrange({ clientId: 'test-client', clientSecret: 'test-secret', merchantKey: 'test-merchant' });
const airtelMock = createMockAirtel({ clientId: 'test-client', clientSecret: 'test-secret' });
const originalEnv = { ...process.env };

beforeAll(async () => {
  const orange = await orangeMock.listen();
  const airtel = await airtelMock.listen();
  for (const key of Object.keys(process.env)) if (key.startsWith('MVOLA_')) delete process.env[key];
  Object.assign(process.env, {
    ORANGE_MONEY_CLIENT_ID: 'test-client',
    ORANGE_MONEY_CLIENT_SECRET: 'test-secret',
    ORANGE_MONEY_MERCHANT_KEY: 'test-merchant',
    ORANGE_MONEY_API_BASE_URL: orange.url,
    ORANGE_MONEY_NOTIF_URL: 'http://127.0.0.1:9/notif', // injoignable : les notifications ne sont pas testées ici
    PUBLIC_SITE_URL: 'https://all.example.mg',
    AIRTEL_MONEY_CLIENT_ID: 'test-client',
    AIRTEL_MONEY_CLIENT_SECRET: 'test-secret',
    AIRTEL_MONEY_API_BASE_URL: airtel.url,
  });
});
afterAll(async () => {
  await orangeMock.close();
  await airtelMock.close();
  process.env = originalEnv;
});

// Base de données simulée (se comporte comme la vraie : réclamation conditionnelle, unicité non simulée)
let attempt: any;
const orderUpdates: any[] = [];
const orderUpdateManys: any[] = [];
let idCounter = 0;

beforeEach(() => {
  mockReset(prismaMock);
  orangeMock.requests.length = 0;
  orangeMock.sessions.clear();
  airtelMock.requests.length = 0;
  airtelMock.transactions.clear();
  vi.mocked(sendPaymentConfirmedEmail).mockClear();
  orderUpdates.length = 0;
  orderUpdateManys.length = 0;
  attempt = undefined;

  prismaMock.paymentAttempt.findUnique.mockImplementation((async () => (attempt ? { ...attempt } : null)) as any);
  prismaMock.paymentAttempt.findFirst.mockImplementation((async ({ where }: any) => {
    if (where.status === 'pending' && where.orderId) return null; // pas de demande déjà en cours
    if (!attempt || (where.provider && attempt.provider !== where.provider)) return null;
    const matches = (where.OR ?? []).some((cond: any) => Object.entries(cond).every(([k, v]) => attempt[k] === v));
    return matches ? { ...attempt } : null;
  }) as any);
  prismaMock.paymentAttempt.findMany.mockResolvedValue([]);
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
    idCounter++;
    attempt = {
      id: `0000000${idCounter}-aaaa-bbbb-cccc-dddddddddddd`,
      serverCorrelationId: null,
      transactionId: null,
      paymentUrl: null,
      notifToken: null,
      providerStatus: null,
      failureReason: null,
      createdAt: new Date(),
      ...data,
    };
    return { ...attempt };
  }) as any);
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
  paymentMethod: 'orange_money',
  total: 100_000,
  subtotal: 100_000,
  sellerId: null,
  stockReserved: true,
  guestName: 'Rakoto Jean',
  guestEmail: 'jean@example.mg',
  guestPhone: '032 11 111 11',
  company: null,
  user: null,
  ...overrides,
});
const groupOf = (method: string) => [
  order({ paymentMethod: method }),
  order({ id: 'o2', orderNumber: 'ORD-2', total: 50_000, subtotal: 50_000, paymentMethod: method }),
];

// --------------------------------------------------------------------------------------------------------------------
describe('Orange Money', () => {
  const group = groupOf('orange_money');
  const anchor = group[0] as any;

  async function started(extra: Partial<any> = {}) {
    const { attempt: created } = await initiateAutoPayment({ group: group as any, anchor });
    attempt = { ...attempt, ...extra };
    prismaMock.order.findMany.mockResolvedValue(group as any);
    return created;
  }

  it('crée la session Orange sans demander de numéro, pour le total du panier, et renvoie la page de paiement', async () => {
    const { attempt: created, reused } = await initiateAutoPayment({ group: group as any, anchor });

    expect(reused).toBe(false);
    expect(created).toMatchObject({ provider: 'orange_money', amount: 150_000, payerPhone: '', status: 'pending' });
    expect(created.paymentUrl).toContain('/pay/');
    expect(created.notifToken).toBeTruthy();
    expect(created.serverCorrelationId).toBeTruthy(); // pay_token

    const request = orangeMock.requests.find((r) => r.path.endsWith('/webpayment'))!;
    expect(request.body).toMatchObject({
      merchant_key: 'test-merchant',
      order_id: compactId(created.id),
      amount: 150_000,
      currency: 'OUV',
    });
    expect(request.body.order_id.length).toBeLessThanOrEqual(30);
    // Le client revient sur la page de confirmation (toutes les commandes du panier), sans e-mail dans l'adresse
    expect(request.body.return_url).toBe('https://all.example.mg/checkout/confirmation?order=ORD-1%2CORD-2&paiement=retour');
    expect(request.body.cancel_url).toBe('https://all.example.mg/checkout/confirmation?order=ORD-1%2CORD-2&paiement=annule');
    expect(request.body.return_url).not.toContain('@');
  });

  it('met les commandes en attente de paiement avec la référence ORANGE_MONEY: et sans numéro', async () => {
    await initiateAutoPayment({ group: group as any, anchor });
    const submitted = orderUpdateManys.find((u) => u.data.paymentStatus === 'submitted');
    expect(submitted.where.id.in).toEqual(['o1', 'o2']);
    expect(submitted.data.paymentReference).toMatch(/^ORANGE_MONEY:/);
    expect(submitted.data.paymentPayerPhone).toBeNull();
  });

  it('n’applique pas la limite par numéro (le client n’en donne pas) mais garde celle par commande', async () => {
    prismaMock.paymentAttempt.count.mockImplementation((async ({ where }: any) => (where.payerPhone !== undefined ? 99 : 0)) as any);
    await expect(initiateAutoPayment({ group: group as any, anchor })).resolves.toMatchObject({ reused: false });

    prismaMock.paymentAttempt.count.mockImplementation((async ({ where }: any) => (where.orderId ? 5 : 0)) as any);
    await expect(initiateAutoPayment({ group: group as any, anchor })).rejects.toMatchObject({ status: 429 });
  });

  it('ignore un numéro éventuellement envoyé (Orange le demande sur sa propre page)', async () => {
    const { attempt: created } = await initiateAutoPayment({ group: group as any, anchor, payerPhone: 'nimportequoi' });
    expect(created.payerPhone).toBe('');
  });

  it('reste en attente tant que le client n’a pas payé sur la page d’Orange', async () => {
    const created = await started();
    expect((await reconcileAttempt(created.id))?.status).toBe('pending');
    expect(orderUpdates).toHaveLength(0);
  });

  it('valide le paiement confirmé par Orange : commandes payées et démarrées, référence de transaction, e-mail', async () => {
    const created = await started();
    orangeMock.resolveSession(created.serverCorrelationId!, 'SUCCESS');

    const result = await reconcileAttempt(created.id);

    expect(result?.status).toBe('completed');
    expect(orderUpdates).toHaveLength(2);
    for (const update of orderUpdates) {
      expect(update.data).toMatchObject({ paymentStatus: 'paid', status: 'processing' });
      expect(update.data.paymentReference).toMatch(/^ORANGE_MONEY:MP\d+/);
    }
    expect(sendPaymentConfirmedEmail).toHaveBeenCalledWith(expect.objectContaining({ orderNumbers: ['ORD-1', 'ORD-2'], totalAmount: 150_000 }));
  });

  it('interroge Orange avec le montant attendu : la vérification porte sur ce qui a été demandé', async () => {
    const created = await started();
    await reconcileAttempt(created.id);
    const status = orangeMock.requests.filter((r) => r.path.endsWith('/transactionstatus')).at(-1)!;
    expect(status.body).toEqual({ order_id: compactId(created.id), amount: 150_000, pay_token: created.serverCorrelationId });
  });

  it('remet les commandes à payer quand le client annule sur la page d’Orange', async () => {
    const created = await started();
    orangeMock.resolveSession(created.serverCorrelationId!, 'FAILED');

    const result = await reconcileAttempt(created.id);

    expect(result?.status).toBe('failed');
    expect(result?.failureReason).toContain('Orange Money');
    const revert = orderUpdateManys.find((u) => u.data.paymentStatus === 'awaiting');
    expect(revert.where).toMatchObject({ checkoutGroup: 'g1', paymentStatus: 'submitted', paymentReference: { startsWith: 'ORANGE_MONEY:' } });
    expect(orderUpdates).toHaveLength(0);
  });

  it('ne valide PAS quand le total du panier a changé entre la demande et le paiement', async () => {
    const created = await started();
    prismaMock.order.findMany.mockResolvedValue([group[0], { ...group[1], status: 'cancelled' }] as any);
    orangeMock.resolveSession(created.serverCorrelationId!, 'SUCCESS');

    const result = await reconcileAttempt(created.id);

    expect(result?.status).toBe('review');
    expect(result?.failureReason).toContain('total du panier a changé');
    expect(orderUpdates).toHaveLength(0);
  });

  it('ne règle qu’une seule fois quand le client, le rappel et la tâche de fond vérifient en même temps', async () => {
    const created = await started();
    orangeMock.resolveSession(created.serverCorrelationId!, 'SUCCESS');

    await Promise.all([reconcileAttempt(created.id), reconcileAttempt(created.id), reconcileAttempt(created.id)]);

    expect(orderUpdates).toHaveLength(2);
    expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1);
  });

  it('laisse 30 minutes au client (page d’Orange), puis abandonne', async () => {
    const created = await started({ createdAt: new Date(Date.now() - 20 * 60 * 1000) });
    expect((await reconcileAttempt(created.id))?.status).toBe('pending');

    attempt.createdAt = new Date(Date.now() - 31 * 60 * 1000);
    const result = await reconcileAttempt(created.id);
    expect(result?.status).toBe('failed');
    expect(result?.failureReason).toBe('Délai de confirmation dépassé (30 min)');
  });

  it('ne conclut rien quand Orange est injoignable : la tentative reste en attente', async () => {
    const created = await started();
    const base = process.env.ORANGE_MONEY_API_BASE_URL;
    process.env.ORANGE_MONEY_API_BASE_URL = 'http://127.0.0.1:9';
    try {
      expect((await reconcileAttempt(created.id))?.status).toBe('pending');
    } finally {
      process.env.ORANGE_MONEY_API_BASE_URL = base;
    }
  });

  it('un échec de création de session (panne) laisse les commandes intactes et répond 503', async () => {
    orangeMock.failNextSession();
    const error = await initiateAutoPayment({ group: group as any, anchor }).catch((e) => e);
    expect(error).toMatchObject({ status: 503 });
    expect(error.message).toContain('Orange Money');
    expect(attempt.status).toBe('failed');
    expect(orderUpdateManys.find((u) => u.data.paymentStatus === 'submitted')).toBeUndefined();
  });

  describe('message de rappel (notification d’Orange)', () => {
    it('retrouve la tentative par notif_token et déclenche la vérification auprès d’Orange', async () => {
      const created = await started();
      orangeMock.resolveSession(created.serverCorrelationId!, 'SUCCESS');

      const found = await handleOperatorCallback('orange_money', { status: 'SUCCESS', notif_token: created.notifToken, txnid: 'MP-forge' });

      expect(found).toBe(true);
      expect(attempt.status).toBe('completed');
      expect(orderUpdates[0].data.paymentReference).not.toContain('MP-forge'); // la référence vient d'Orange, pas du message
    });

    it('ne valide rien sur la seule foi du message : un faux « SUCCESS » sans paiement chez Orange ne change rien', async () => {
      const created = await started();

      await handleOperatorCallback('orange_money', { status: 'SUCCESS', notif_token: created.notifToken });

      expect(attempt.status).toBe('pending');
      expect(orderUpdates).toHaveLength(0);
    });

    it.each([{}, { notif_token: '' }, { notif_token: 'x'.repeat(200) }, { notif_token: 'inconnu' }, { notif_token: { $ne: null } }])(
      'ignore un message inexploitable ou inconnu (%j)',
      async (body) => {
        await started();
        expect(await handleOperatorCallback('orange_money', body)).toBe(false);
        expect(orderUpdates).toHaveLength(0);
      }
    );

    it('n’utilise pas le message d’un autre opérateur pour retrouver une tentative Orange', async () => {
      const created = await started();
      expect(await handleOperatorCallback('airtel_money', { transaction: { id: created.serverCorrelationId } })).toBe(false);
    });
  });

  it('la tâche de fond vérifie les tentatives en attente', async () => {
    const created = await started({ createdAt: new Date(Date.now() - 60_000) });
    prismaMock.paymentAttempt.findMany.mockImplementation((async ({ where }: any) => (where.status === 'pending' ? [{ ...attempt }] : [])) as any);
    orangeMock.resolveSession(created.serverCorrelationId!, 'SUCCESS');

    expect(await reconcilePendingAttempts()).toBe(1);
    expect(attempt.status).toBe('completed');
  });

  it('signale pour revue un paiement confirmé APRÈS l’abandon de la demande', async () => {
    const created = await started();
    attempt = { ...attempt, status: 'failed', failureReason: 'Délai de confirmation dépassé (30 min)', updatedAt: new Date() };
    prismaMock.paymentAttempt.findMany.mockImplementation((async ({ where }: any) => (where.status === 'failed' ? [{ ...attempt }] : [])) as any);
    orangeMock.resolveSession(created.serverCorrelationId!, 'SUCCESS');

    await reconcilePendingAttempts();

    expect(attempt.status).toBe('review');
    expect(attempt.failureReason).toContain('APRÈS');
    expect(orderUpdates).toHaveLength(0);
  });

  it('est désactivé sans identifiants : 503 et paiement manuel seul', async () => {
    const id = process.env.ORANGE_MONEY_CLIENT_ID;
    process.env.ORANGE_MONEY_CLIENT_ID = '';
    try {
      expect(getOrangeClient()).toBeNull();
      await expect(initiateAutoPayment({ group: group as any, anchor })).rejects.toMatchObject({ status: 503 });
    } finally {
      process.env.ORANGE_MONEY_CLIENT_ID = id;
    }
  });
});

// --------------------------------------------------------------------------------------------------------------------
describe('Airtel Money', () => {
  const group = groupOf('airtel_money');
  const anchor = group[0] as any;

  async function started(payer = '033 35 000 03') {
    const { attempt: created } = await initiateAutoPayment({ group: group as any, anchor, payerPhone: payer });
    prismaMock.order.findMany.mockResolvedValue(group as any);
    return created;
  }

  it('envoie la demande à Airtel pour le total du panier et met les commandes en attente de confirmation', async () => {
    const created = await started();

    expect(created).toMatchObject({ provider: 'airtel_money', amount: 150_000, payerPhone: '0333500003', status: 'pending' });
    expect(created.serverCorrelationId).toBe(compactId(created.id));
    expect(created.paymentUrl).toBeNull();

    const request = airtelMock.requests.find((r) => r.path === '/merchant/v1/payments/')!;
    expect(request.body).toMatchObject({ subscriber: { msisdn: '333500003' }, transaction: { amount: 150_000, id: compactId(created.id) } });

    const submitted = orderUpdateManys.find((u) => u.data.paymentStatus === 'submitted');
    expect(submitted.data).toMatchObject({ paymentPayerPhone: '0333500003' });
    expect(submitted.data.paymentReference).toMatch(/^AIRTEL_MONEY:/);
  });

  it.each([
    ['un numéro MVola', '034 35 000 03'],
    ['un numéro Orange', '032 35 000 03'],
    ['un numéro trop court', '033 12'],
    ['un numéro absent', ''],
  ])('refuse %s (033 exigé) sans rien envoyer à Airtel', async (_label, phone) => {
    const error = await initiateAutoPayment({ group: group as any, anchor, payerPhone: phone }).catch((e) => e);
    expect(error).toMatchObject({ status: 400 });
    expect(error.message).toContain('033');
    expect(airtelMock.requests).toHaveLength(0);
  });

  it('applique la limite de 3 demandes par numéro et par heure', async () => {
    prismaMock.paymentAttempt.count.mockImplementation((async ({ where }: any) => (where.payerPhone ? 3 : 0)) as any);
    await expect(initiateAutoPayment({ group: group as any, anchor, payerPhone: '0333500003' })).rejects.toMatchObject({ status: 429 });
    expect(airtelMock.requests).toHaveLength(0);
  });

  it('valide le paiement confirmé (TS) : commandes payées avec la référence Airtel et le numéro du client', async () => {
    const created = await started();
    airtelMock.resolveTransaction(created.serverCorrelationId!, 'TS');

    const result = await reconcileAttempt(created.id);

    expect(result?.status).toBe('completed');
    expect(orderUpdates).toHaveLength(2);
    for (const update of orderUpdates) {
      expect(update.data).toMatchObject({ paymentStatus: 'paid', paymentPayerPhone: '0333500003', status: 'processing' });
      expect(update.data.paymentReference).toMatch(/^AIRTEL_MONEY:MP\d+/);
    }
    expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1);
  });

  it('reste en attente tant que le client n’a pas confirmé (TIP)', async () => {
    const created = await started('033 35 000 05');
    expect((await reconcileAttempt(created.id))?.status).toBe('pending');
    expect(orderUpdates).toHaveLength(0);
  });

  it('remet les commandes à payer quand le client refuse (TF)', async () => {
    const created = await started('033 35 000 04');
    airtelMock.resolveTransaction(created.serverCorrelationId!, 'TF');

    const result = await reconcileAttempt(created.id);

    expect(result?.status).toBe('failed');
    const revert = orderUpdateManys.find((u) => u.data.paymentStatus === 'awaiting');
    expect(revert.where.paymentReference).toEqual({ startsWith: 'AIRTEL_MONEY:' });
    expect(orderUpdates).toHaveLength(0);
  });

  it('ne valide PAS quand le total du panier a changé', async () => {
    const created = await started();
    prismaMock.order.findMany.mockResolvedValue([group[0], { ...group[1], status: 'cancelled' }] as any);
    airtelMock.resolveTransaction(created.serverCorrelationId!, 'TS');

    const result = await reconcileAttempt(created.id);

    expect(result?.status).toBe('review');
    expect(orderUpdates).toHaveLength(0);
  });

  it('abandonne une demande jamais confirmée au bout de 15 minutes', async () => {
    const created = await started('033 35 000 05');
    attempt.createdAt = new Date(Date.now() - 16 * 60 * 1000);
    const result = await reconcileAttempt(created.id);
    expect(result?.status).toBe('failed');
    expect(result?.failureReason).toBe('Délai de confirmation dépassé (15 min)');
  });

  it('répond 503 quand Airtel est en panne et 502 quand Airtel refuse la demande, sans toucher aux commandes', async () => {
    const outage = await initiateAutoPayment({ group: group as any, anchor, payerPhone: '033 35 000 07' }).catch((e) => e);
    expect(outage).toMatchObject({ status: 503 });
    expect(attempt.status).toBe('failed');

    const refused = await initiateAutoPayment({ group: group as any, anchor, payerPhone: '033 35 000 08' }).catch((e) => e);
    expect(refused).toMatchObject({ status: 502 });
    expect(refused.message).toContain('Airtel Money');
    expect(orderUpdateManys.find((u) => u.data.paymentStatus === 'submitted')).toBeUndefined();
  });

  it('message de rappel : retrouve la tentative par transaction.id et vérifie auprès d’Airtel (le message n’est pas cru)', async () => {
    const created = await started();

    // Faux message « payé » alors qu'Airtel n'a rien encaissé : aucun effet
    expect(await handleOperatorCallback('airtel_money', { transaction: { id: created.serverCorrelationId, status_code: 'TS' } })).toBe(true);
    expect(attempt.status).toBe('pending');

    airtelMock.resolveTransaction(created.serverCorrelationId!, 'TS');
    await handleOperatorCallback('airtel_money', { transaction: { id: created.serverCorrelationId, status_code: 'TS' } });
    expect(attempt.status).toBe('completed');
  });

  it.each([{}, { transaction: {} }, { transaction: { id: '' } }, { transaction: { id: 'x'.repeat(200) } }, { transaction: 'texte' }])(
    'ignore un message inexploitable (%j)',
    async (body) => {
      await started();
      expect(await handleOperatorCallback('airtel_money', body)).toBe(false);
    }
  );

  it('est désactivé sans identifiants : 503 et paiement manuel seul', async () => {
    const id = process.env.AIRTEL_MONEY_CLIENT_ID;
    process.env.AIRTEL_MONEY_CLIENT_ID = '';
    try {
      expect(getAirtelClient()).toBeNull();
      await expect(initiateAutoPayment({ group: group as any, anchor, payerPhone: '0333500003' })).rejects.toMatchObject({ status: 503 });
    } finally {
      process.env.AIRTEL_MONEY_CLIENT_ID = id;
    }
  });
});

describe('commande sans opérateur reconnu', () => {
  it('refuse (400) une commande dont le moyen de paiement n’est pas un Mobile Money connu', async () => {
    const odd = [order({ paymentMethod: 'cheque' })];
    await expect(initiateAutoPayment({ group: odd as any, anchor: odd[0] as any })).rejects.toMatchObject({ status: 400 });
  });
});
