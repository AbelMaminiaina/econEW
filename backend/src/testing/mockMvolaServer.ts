import express from 'express';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

// Faux serveur MVola (bac à sable local) : reproduit le contrat de l'API Merchant Pay pour tester l'intégration
// sans compte MVola. Le comportement dépend du numéro du client (comme les numéros de test du bac à sable) :
//   0343500003 -> le client confirme : paiement « completed »
//   0343500004 -> le client refuse    : « failed »
//   0343500005 -> le client ne répond jamais : reste « pending »
//   0343500006 -> « completed » mais avec un montant DIFFÉRENT (test de la vérification du montant)
//   0343500007 -> MVola répond 500 à la demande de paiement
// Outil de test uniquement : ne jamais l'exposer en production.

export type MockOutcome = 'completed' | 'failed' | 'pending';

interface MockTransaction {
  serverCorrelationId: string;
  objectReference: string;
  amount: string;
  currency: string;
  reference: string;
  debit: string;
  credit: string;
  status: MockOutcome;
  callbackUrl?: string;
  reportedAmount?: string; // montant renvoyé dans les détails (différent du montant demandé pour 0343500006)
}

export interface MockMvolaOptions {
  consumerKey?: string;
  consumerSecret?: string;
  /** Délai (ms) avant que le « client » confirme ou refuse sur son téléphone ; 0 = seulement via resolve() */
  autoResolveMs?: number;
  /** false = ne garde pas l'historique des requêtes (mode démo, serveur longue durée) */
  recordRequests?: boolean;
}

export interface MockRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
}

export function createMockMvola(options: MockMvolaOptions = {}) {
  const key = options.consumerKey ?? 'test-key';
  const secret = options.consumerSecret ?? 'test-secret';
  const autoResolveMs = options.autoResolveMs ?? 0;
  const requests: MockRequest[] = [];
  const transactions = new Map<string, MockTransaction>();
  const byObjectReference = new Map<string, MockTransaction>();
  const tokens = new Set<string>();
  let tokenCounter = 0;
  let rejectNextToken = false;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use((req, _res, next) => {
    if (options.recordRequests !== false) requests.push({ method: req.method, path: req.path, headers: { ...req.headers }, body: req.body });
    next();
  });

  // --- Authentification OAuth2 ---
  app.post('/token', (req, res) => {
    const expected = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
    if (rejectNextToken || req.headers.authorization !== expected) {
      rejectNextToken = false;
      return res.status(401).json({ error: 'invalid_client' });
    }
    if (req.body?.grant_type !== 'client_credentials' || req.body?.scope !== 'EXT_INT_MVOLA_SCOPE') {
      return res.status(400).json({ error: 'invalid_request' });
    }
    const token = `mock-token-${++tokenCounter}`;
    tokens.add(token);
    res.json({ access_token: token, scope: 'EXT_INT_MVOLA_SCOPE', token_type: 'Bearer', expires_in: 3600 });
  });

  const requireToken: express.RequestHandler = (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token || !tokens.has(token)) return res.status(401).json({ ErrorCategory: 'authentication', ErrorDescription: 'Invalid token' });
    // En-têtes obligatoires de l'API
    for (const header of ['version', 'x-correlationid', 'useraccountidentifier', 'partnername']) {
      if (!req.headers[header]) return res.status(400).json({ ErrorCategory: 'validation', ErrorDescription: `Missing header ${header}` });
    }
    next();
  };

  function resolve(id: string, outcome: MockOutcome) {
    const tx = transactions.get(id);
    if (!tx || tx.status !== 'pending') return;
    tx.status = outcome;
    if (outcome === 'completed' && tx.callbackUrl) {
      // Notification de MVola (non signée) : le site ne doit s'en servir que comme déclencheur
      fetch(tx.callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionStatus: 'completed', objectReference: tx.objectReference, serverCorrelationId: tx.serverCorrelationId, requestingOrganisationTransactionReference: tx.reference, amount: tx.amount, currency: tx.currency }),
      }).catch(() => undefined);
    }
  }

  const BASE = '/mvola/mm/transactions/type/merchantpay/1.0.0';

  // --- Initier un paiement ---
  app.post(`${BASE}/`, requireToken, (req, res) => {
    const b = req.body ?? {};
    const party = (list: any) => (Array.isArray(list) ? list.find((p: any) => p?.key === 'msisdn')?.value : undefined);
    const debit = party(b.debitParty);
    const credit = party(b.creditParty);
    if (!b.amount || !/^\d+$/.test(String(b.amount)) || b.currency !== 'Ar' || !debit || !credit || !b.requestingOrganisationTransactionReference || !b.descriptionText) {
      return res.status(400).json({ ErrorCategory: 'validation', ErrorDescription: 'Invalid request body' });
    }
    if (String(b.descriptionText).length > 50) return res.status(400).json({ ErrorDescription: 'descriptionText too long' });
    if (debit === '0343500007') return res.status(500).json({ ErrorCategory: 'technical', ErrorDescription: 'Internal error' });

    const tx: MockTransaction = {
      serverCorrelationId: randomUUID(),
      objectReference: String(Math.floor(1e9 + Math.random() * 9e9)),
      amount: String(b.amount),
      currency: b.currency,
      reference: b.requestingOrganisationTransactionReference,
      debit,
      credit,
      status: 'pending',
      callbackUrl: typeof req.headers['x-callback-url'] === 'string' ? req.headers['x-callback-url'] : undefined,
      reportedAmount: debit === '0343500006' ? String(Number(b.amount) - 1000) : undefined,
    };
    transactions.set(tx.serverCorrelationId, tx);
    byObjectReference.set(tx.objectReference, tx);

    const outcome: MockOutcome | null =
      debit === '0343500004' ? 'failed' : debit === '0343500005' ? null : 'completed';
    if (outcome && autoResolveMs > 0) setTimeout(() => resolve(tx.serverCorrelationId, outcome), autoResolveMs);

    res.status(202).json({
      status: 'pending',
      serverCorrelationId: tx.serverCorrelationId,
      notificationMethod: tx.callbackUrl ? 'callback' : 'polling',
      objectReference: tx.objectReference,
    });
  });

  // --- Statut d'une demande ---
  app.get(`${BASE}/status/:id`, requireToken, (req, res) => {
    const tx = transactions.get(req.params.id);
    if (!tx) return res.status(404).json({ ErrorDescription: 'Unknown serverCorrelationId' });
    res.json({ status: tx.status, serverCorrelationId: tx.serverCorrelationId, notificationMethod: 'polling', objectReference: tx.objectReference });
  });

  // --- Détails d'une transaction ---
  app.get(`${BASE}/:objectReference`, requireToken, (req, res) => {
    const tx = byObjectReference.get(req.params.objectReference);
    if (!tx) return res.status(404).json({ ErrorDescription: 'Unknown transaction' });
    res.json({
      amount: tx.reportedAmount ?? tx.amount,
      currency: tx.currency,
      requestingOrganisationTransactionReference: tx.reference,
      transactionStatus: tx.status,
      debitParty: [{ key: 'msisdn', value: tx.debit }],
      creditParty: [{ key: 'msisdn', value: tx.credit }],
      objectReference: tx.objectReference,
    });
  });

  let server: Server | null = null;
  return {
    app,
    requests,
    transactions,
    /** Simule la réponse du client sur son téléphone */
    resolveTransaction: resolve,
    /** Fait échouer le prochain appel /token (jeton refusé) */
    rejectNextToken() {
      rejectNextToken = true;
    },
    /** Invalide tous les jetons émis (simule une expiration côté MVola) */
    revokeTokens() {
      tokens.clear();
    },
    tokenCount: () => tokenCounter,
    async listen(port = 0): Promise<{ url: string; port: number }> {
      await new Promise<void>((ok) => {
        server = app.listen(port, '127.0.0.1', () => ok());
      });
      const actual = (server!.address() as { port: number }).port;
      return { url: `http://127.0.0.1:${actual}`, port: actual };
    },
    async close(): Promise<void> {
      await new Promise<void>((ok) => (server ? server.close(() => ok()) : ok()));
    },
  };
}
