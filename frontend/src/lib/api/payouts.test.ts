import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createPayout,
  getEligibleOrders,
  getPayoutHistory,
  getPayoutSummary,
  getSellerEarnings,
  savePayoutDetails,
  setSellerCommission,
  PAYOUT_METHOD_OPTIONS,
} from './payouts';

function mockFetchJson(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('payouts API (administrateur)', () => {
  it('lit le résumé avec le jeton admin', async () => {
    const fetchMock = mockFetchJson({ sellers: [] });
    await getPayoutSummary('jwt');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/payouts/admin/summary');
    expect(options.headers).toMatchObject({ Authorization: 'Bearer jwt' });
  });

  it("liste les commandes éligibles d'un vendeur", async () => {
    const fetchMock = mockFetchJson({ orders: [] });
    await getEligibleOrders('s1', 'jwt');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/payouts/admin/sellers/s1/eligible');
  });

  it('enregistre un reversement (POST)', async () => {
    const fetchMock = mockFetchJson({ success: true });
    await createPayout('s1', { method: 'mvola', reference: 'REF123', orderIds: ['o1'] }, 'jwt');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/payouts/admin/sellers/s1/payouts');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ method: 'mvola', reference: 'REF123', orderIds: ['o1'] });
  });

  it("filtre l'historique par vendeur", async () => {
    const fetchMock = mockFetchJson({ payouts: [] });
    await getPayoutHistory('jwt', 's 1');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/payouts/admin/history?sellerId=s%201');
  });

  it('envoie null pour revenir au taux par défaut', async () => {
    const fetchMock = mockFetchJson({ success: true });
    await setSellerCommission('s1', null, 'jwt');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/payouts/admin/sellers/s1/commission');
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual({ rate: null });
  });
});

describe('payouts API (vendeur)', () => {
  it('lit mes gains', async () => {
    const fetchMock = mockFetchJson({});
    await getSellerEarnings('jwt');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/payouts/seller/summary');
  });

  it('enregistre mes coordonnées de versement (PUT)', async () => {
    const fetchMock = mockFetchJson({ success: true });
    await savePayoutDetails({ method: 'orange_money', number: '032 00 000 00' }, 'jwt');
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/payouts/seller/payout-details');
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body)).toEqual({ method: 'orange_money', number: '032 00 000 00' });
  });
});

describe('PAYOUT_METHOD_OPTIONS', () => {
  it('propose les quatre moyens de reversement', () => {
    expect(PAYOUT_METHOD_OPTIONS.map((o) => o.value)).toEqual(['mvola', 'orange_money', 'airtel_money', 'bank_transfer']);
  });
});
