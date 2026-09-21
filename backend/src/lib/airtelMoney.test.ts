import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createMockAirtel } from '../testing/mockAirtelServer.js';
import { AirtelMoneyClient, getAirtelConfig, mapAirtelStatus, type AirtelConfig } from './airtelMoney.js';
import { OperatorError } from './operatorHttp.js';

describe('getAirtelConfig', () => {
  const base = { AIRTEL_MONEY_CLIENT_ID: 'id', AIRTEL_MONEY_CLIENT_SECRET: 'secret' } as NodeJS.ProcessEnv;

  it('est null tant que les identifiants ne sont pas tous renseignés (le paiement manuel reste seul actif)', () => {
    expect(getAirtelConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(getAirtelConfig({ ...base, AIRTEL_MONEY_CLIENT_SECRET: '' })).toBeNull();
  });

  it('utilise l’environnement d’essai par défaut, la production seulement sur demande explicite', () => {
    expect(getAirtelConfig(base)).toMatchObject({ sandbox: true, baseUrl: 'https://openapiuat.airtel.africa' });
    expect(getAirtelConfig({ ...base, AIRTEL_MONEY_ENV: 'production' })).toMatchObject({ sandbox: false, baseUrl: 'https://openapi.airtel.africa' });
    expect(getAirtelConfig({ ...base, AIRTEL_MONEY_ENV: 'Prod' })?.sandbox).toBe(true);
  });

  it('accepte une URL de base personnalisée (faux serveur)', () => {
    expect(getAirtelConfig({ ...base, AIRTEL_MONEY_API_BASE_URL: 'http://localhost:4012/' })?.baseUrl).toBe('http://localhost:4012');
  });
});

describe('mapAirtelStatus', () => {
  it.each([['TS', 'completed'], ['TF', 'failed'], ['TE', 'failed'], ['TIP', 'pending'], ['TA', 'pending']])('%s -> %s', (input, expected) =>
    expect(mapAirtelStatus(input)).toBe(expected)
  );

  it.each([undefined, null, 42, '', 'INCONNU'])('un statut inconnu (%j) reste « pending » : jamais de validation sur une supposition', (input) => {
    expect(mapAirtelStatus(input)).toBe('pending');
  });
});

describe('AirtelMoneyClient (contre le faux serveur Airtel)', () => {
  const mock = createMockAirtel({ clientId: 'test-client', clientSecret: 'test-secret' });
  let config: AirtelConfig;
  let client: AirtelMoneyClient;

  beforeAll(async () => {
    const { url } = await mock.listen();
    config = { clientId: 'test-client', clientSecret: 'test-secret', sandbox: true, baseUrl: url };
  });
  afterAll(() => mock.close());
  beforeEach(() => {
    mock.requests.length = 0;
    mock.transactions.clear();
    client = new AirtelMoneyClient(config);
  });

  const pay = (payerNumber = '0333500003', transactionId = 'tx1', amount = 150_000) => client.initiate({ transactionId, amount, payerNumber });

  it('envoie la demande de paiement au format Airtel (msisdn sans le 0, pays et devise MG / MGA)', async () => {
    const started = await pay('033 35 000 03');

    expect(started).toEqual({ transactionId: 'tx1', status: 'pending' });
    const request = mock.requests.find((r) => r.path === '/merchant/v1/payments/')!;
    expect(request.headers['x-country']).toBe('MG');
    expect(request.headers['x-currency']).toBe('MGA');
    expect(request.body).toMatchObject({
      reference: 'tx1',
      subscriber: { country: 'MG', currency: 'MGA', msisdn: '333500003' },
      transaction: { amount: 150_000, country: 'MG', currency: 'MGA', id: 'tx1' },
    });
  });

  it('s’authentifie avec client_credentials et met le jeton en cache', async () => {
    await pay('0333500003', 'tx1');
    await pay('0333500003', 'tx2');
    const tokenCalls = mock.requests.filter((r) => r.path === '/auth/oauth2/token');
    expect(tokenCalls).toHaveLength(1);
    expect(tokenCalls[0].body).toEqual({ client_id: 'test-client', client_secret: 'test-secret', grant_type: 'client_credentials' });
  });

  it('renouvelle le jeton une fois s’il est refusé (401)', async () => {
    const before = mock.tokenCount();
    await pay('0333500003', 'tx1');
    mock.revokeTokens();
    expect((await pay('0333500003', 'tx2')).status).toBe('pending');
    expect(mock.tokenCount()).toBe(before + 2);
  });

  it('rapporte « pending » (TIP) puis « completed » (TS) avec l’identifiant Airtel une fois confirmé', async () => {
    await pay();
    expect(await client.getStatus('tx1')).toEqual({ status: 'pending', airtelMoneyId: undefined });

    mock.resolveTransaction('tx1', 'TS');
    const done = await client.getStatus('tx1');
    expect(done.status).toBe('completed');
    expect(done.airtelMoneyId).toMatch(/^MP\d+/);
  });

  it('rapporte « failed » (TF) quand le client refuse', async () => {
    await pay('0333500004');
    mock.resolveTransaction('tx1', 'TF');
    expect((await client.getStatus('tx1')).status).toBe('failed');
  });

  it('signale une transaction inconnue par une erreur 404', async () => {
    const error = await client.getStatus('inconnue').catch((e) => e);
    expect(error).toBeInstanceOf(OperatorError);
    expect(error.status).toBe(404);
  });

  it.each(['0341234567', '0321234567', '123', ''])('refuse le numéro %j avant tout appel réseau (Airtel = 033)', async (number) => {
    await expect(pay(number)).rejects.toThrow('Numéro Airtel Money invalide');
    expect(mock.requests).toHaveLength(0);
  });

  it('refuse un montant invalide avant tout appel réseau', async () => {
    for (const amount of [0, -5, 10.5]) await expect(pay('0333500003', 'tx1', amount)).rejects.toThrow('Montant invalide');
    expect(mock.requests).toHaveLength(0);
  });

  it('traite une panne d’Airtel (500) comme réessayable', async () => {
    const error = await pay('0333500007').catch((e) => e);
    expect(error).toMatchObject({ status: 500, retriable: true });
  });

  it('convertit un refus logique (HTTP 200, success: false) en erreur définitive avec le motif', async () => {
    const error = await pay('0333500008').catch((e) => e);
    expect(error).toBeInstanceOf(OperatorError);
    expect(error.retriable).toBe(false);
    expect(error.message).toContain('Subscriber not eligible');
  });

  it('refuse des identifiants invalides à l’authentification', async () => {
    const bad = new AirtelMoneyClient({ ...config, clientSecret: 'faux' });
    await expect(bad.initiate({ transactionId: 'tx1', amount: 1000, payerNumber: '0333500003' })).rejects.toMatchObject({ status: 401 });
  });

  it('convertit une erreur réseau en erreur réessayable', async () => {
    const down = new AirtelMoneyClient(config, (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch);
    const error = await down.getStatus('tx1').catch((e) => e);
    expect(error).toMatchObject({ retriable: true });
    expect(error.message).toContain('injoignable');
  });
});
