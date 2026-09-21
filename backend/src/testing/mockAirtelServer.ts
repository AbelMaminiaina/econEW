import express from 'express';
import type { Server } from 'node:http';

// Faux serveur Airtel Money (bac à sable local) : reproduit le contrat de l'API Collections d'Airtel Africa pour
// tester l'intégration sans compte Airtel. Le comportement dépend du numéro du client (msisdn sans le 0 initial) :
//   333500003 (033 35 000 03) -> le client confirme : « TS » (payé)
//   333500004                 -> le client refuse    : « TF » (échec)
//   333500005                 -> le client ne répond jamais : reste « TIP » (en cours)
//   333500007                 -> Airtel répond 500 à la demande de paiement
//   333500008                 -> Airtel refuse la demande avec HTTP 200 et `status.success: false`
// Outil de test uniquement : ne jamais l'exposer en production.

export type AirtelMockOutcome = 'TS' | 'TF' | 'TIP';

interface MockAirtelTransaction {
  id: string;
  airtelMoneyId: string;
  amount: number;
  msisdn: string;
  status: AirtelMockOutcome;
}

export interface MockAirtelOptions {
  clientId?: string;
  clientSecret?: string;
  /** Délai (ms) avant que le « client » confirme ou refuse ; 0 = seulement via resolveTransaction() */
  autoResolveMs?: number;
  /** Si renseignée, Airtel y notifie le résultat (message non signé, comme en réalité) */
  callbackUrl?: string;
  /** false = ne garde pas l'historique des requêtes (mode démo, serveur longue durée) */
  recordRequests?: boolean;
}

export interface MockAirtelRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
}

export function createMockAirtel(options: MockAirtelOptions = {}) {
  const clientId = options.clientId ?? 'test-client';
  const clientSecret = options.clientSecret ?? 'test-secret';
  const autoResolveMs = options.autoResolveMs ?? 0;
  const requests: MockAirtelRequest[] = [];
  const transactions = new Map<string, MockAirtelTransaction>();
  const tokens = new Set<string>();
  let tokenCounter = 0;

  const ok = (transaction: object) => ({
    data: { transaction },
    status: { code: '200', message: 'SUCCESS', result_code: 'ESB000010', response_code: 'DP00800001006', success: true },
  });

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (options.recordRequests !== false) requests.push({ method: req.method, path: req.path, headers: { ...req.headers }, body: req.body });
    next();
  });

  app.post('/auth/oauth2/token', (req, res) => {
    const b = req.body ?? {};
    if (b.grant_type !== 'client_credentials' || b.client_id !== clientId || b.client_secret !== clientSecret) {
      return res.status(401).json({ error: 'invalid_client', error_description: 'Invalid credentials' });
    }
    const token = `airtel-token-${++tokenCounter}`;
    tokens.add(token);
    res.json({ access_token: token, expires_in: '180', token_type: 'bearer' });
  });

  const requireToken: express.RequestHandler = (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token || !tokens.has(token)) return res.status(401).json({ error: 'unauthorized', error_description: 'Invalid token' });
    if (req.headers['x-country'] !== 'MG' || req.headers['x-currency'] !== 'MGA') {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Missing or wrong X-Country / X-Currency' });
    }
    next();
  };

  function resolve(id: string, outcome: AirtelMockOutcome) {
    const tx = transactions.get(id);
    if (!tx || tx.status !== 'TIP') return;
    tx.status = outcome;
    if (options.callbackUrl) {
      // Notification d'Airtel (non signée) : le site ne doit s'en servir que comme déclencheur
      fetch(options.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: { id: tx.id, message: outcome === 'TS' ? 'Paid' : 'Failed', status_code: outcome, airtel_money_id: tx.airtelMoneyId } }),
      }).catch(() => undefined);
    }
  }

  app.post('/merchant/v1/payments/', requireToken, (req, res) => {
    const b = req.body ?? {};
    const msisdn = String(b.subscriber?.msisdn ?? '');
    const amount = b.transaction?.amount;
    const id = b.transaction?.id;
    if (!/^33\d{7}$/.test(msisdn) || !Number.isInteger(amount) || amount <= 0 || typeof id !== 'string' || !id || !b.reference) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Invalid request body' });
    }
    if (b.transaction.currency !== 'MGA' || b.transaction.country !== 'MG') {
      return res.status(400).json({ error: 'invalid_request', error_description: 'Invalid currency or country' });
    }
    if (id.length > 30) return res.status(400).json({ error: 'invalid_request', error_description: 'transaction.id too long' });
    if (msisdn === '333500007') return res.status(500).json({ error: 'server_error' });
    if (msisdn === '333500008') {
      return res.json({ status: { code: '400', message: 'Subscriber not eligible', result_code: 'ESB000036', success: false } });
    }
    if (transactions.has(id)) return res.status(409).json({ error: 'duplicate', error_description: 'Duplicate transaction id' });

    const tx: MockAirtelTransaction = { id, airtelMoneyId: `MP${Math.floor(1e9 + Math.random() * 9e9)}`, amount, msisdn, status: 'TIP' };
    transactions.set(id, tx);

    const outcome: AirtelMockOutcome | null = msisdn === '333500004' ? 'TF' : msisdn === '333500005' ? null : 'TS';
    if (outcome && autoResolveMs > 0) setTimeout(() => resolve(id, outcome), autoResolveMs);

    res.json(ok({ id: tx.id, status: 'TIP' }));
  });

  app.get('/standard/v1/payments/:id', requireToken, (req, res) => {
    const tx = transactions.get(req.params.id);
    if (!tx) return res.status(404).json({ error: 'not_found', error_description: 'Unknown transaction' });
    res.json(ok({ id: tx.id, airtel_money_id: tx.status === 'TS' ? tx.airtelMoneyId : '', message: tx.status, status: tx.status }));
  });

  let server: Server | null = null;
  return {
    app,
    requests,
    transactions,
    /** Simule la réponse du client sur son téléphone */
    resolveTransaction: resolve,
    /** Invalide tous les jetons émis (simule une expiration côté Airtel) */
    revokeTokens() {
      tokens.clear();
    },
    tokenCount: () => tokenCounter,
    async listen(port = 0): Promise<{ url: string; port: number }> {
      await new Promise<void>((done) => {
        server = app.listen(port, '127.0.0.1', () => done());
      });
      const actual = (server!.address() as { port: number }).port;
      return { url: `http://127.0.0.1:${actual}`, port: actual };
    },
    async close(): Promise<void> {
      await new Promise<void>((done) => (server ? server.close(() => done()) : done()));
    },
  };
}

