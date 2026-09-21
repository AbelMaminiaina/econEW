import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAutoAttempt, startAutoPayment } from './payments';
import { isMvolaNumber } from '@/hooks/usePayment';

function mockFetchJson(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(body) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('paiement instantané par l’opérateur (API client)', () => {
  it('envoie la demande de paiement avec le numéro du client et l’e-mail du visiteur', async () => {
    const fetchMock = mockFetchJson({ success: true, attempt: { id: 'att-1', status: 'pending' } });

    await startAutoPayment({ orderNumber: 'ORD-1', payerPhone: '034 35 000 03', email: 'jean@example.mg' });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/payments/auto/initiate');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ orderNumber: 'ORD-1', payerPhone: '034 35 000 03', email: 'jean@example.mg' });
  });

  it('envoie le jeton d’un client connecté', async () => {
    const fetchMock = mockFetchJson({ success: true });
    await startAutoPayment({ orderNumber: 'ORD-1', payerPhone: '0343500003' }, 'jwt');
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer jwt' });
  });

  it('suit une demande avec l’e-mail encodé', async () => {
    const fetchMock = mockFetchJson({ id: 'att-1', status: 'completed' });

    const attempt = await getAutoAttempt('att-1', { email: 'jean+test@example.mg' });

    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/payments/auto/attempt/att-1?email=jean%2Btest%40example.mg');
    expect(attempt.status).toBe('completed');
  });

  it('n’envoie aucun numéro pour Orange Money (le client le saisit sur la page d’Orange)', async () => {
    const fetchMock = mockFetchJson({ success: true, attempt: { id: 'att-1', provider: 'orange_money', status: 'pending', paymentUrl: 'https://webpayment.orange.example/pay/abc' } });

    const result = await startAutoPayment({ orderNumber: 'ORD-1', email: 'jean@example.mg' });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ orderNumber: 'ORD-1', email: 'jean@example.mg' });
    expect(result.attempt.paymentUrl).toBe('https://webpayment.orange.example/pay/abc');
  });

  it('remonte le message d’erreur du serveur (numéro invalide, service indisponible…)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request', json: () => Promise.resolve({ error: 'Numéro MVola invalide : il doit commencer par 034 ou 038.' }) }));

    await expect(startAutoPayment({ orderNumber: 'ORD-1', payerPhone: '032 12 345 67' })).rejects.toThrow('Numéro MVola invalide');
  });
});

describe('isMvolaNumber (validation côté navigateur)', () => {
  it.each(['034 12 345 67', '038 12 345 67', '+261 34 12 345 67', '0341234567', '261341234567', '034.12.345.67'])('accepte %s', (n) => {
    expect(isMvolaNumber(n)).toBe(true);
  });

  it.each(['', '12', '032 12 345 67', '033 12 345 67', '+33 6 12 34 56 78', '034 12 345 678', 'abc'])('refuse %j', (n) => {
    expect(isMvolaNumber(n)).toBe(false);
  });
});
