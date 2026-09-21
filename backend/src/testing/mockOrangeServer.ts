import express from 'express';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

// Faux serveur Orange Money Web Payment (bac à sable local) : reproduit le contrat de l'API pour tester
// l'intégration sans compte Orange. Comme le vrai service, il fournit une PAGE DE PAIEMENT (`payment_url`) :
//   GET  /pay/:payToken          page où le « client » choisit de payer ou d'annuler
//   POST /pay/:payToken/:outcome  paye (success) ou annule (failed) puis redirige vers return_url / cancel_url
// et notifie ensuite `notif_url` (message non signé contenant le notif_token, comme en réalité).
// Outil de test uniquement : ne jamais l'exposer en production.

export type OrangeMockOutcome = 'SUCCESS' | 'FAILED' | 'PENDING';

interface MockOrangeSession {
  payToken: string;
  notifToken: string;
  orderId: string;
  amount: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
  notifUrl: string;
  status: OrangeMockOutcome;
  txnid?: string;
  /** Montant réellement encaissé (différent du montant demandé pour simuler une fraude) */
  paidAmount?: number;
}

export interface MockOrangeOptions {
  clientId?: string;
  clientSecret?: string;
  merchantKey?: string;
  /** Pays de l'URL (« dev » en bac à sable) */
  country?: string;
  currency?: string;
  /** false = ne garde pas l'historique des requêtes (mode démo, serveur longue durée) */
  recordRequests?: boolean;
  /** Préfixe où l'application est montée (ex. « /api/demo-pay/orange ») : les liens de la page en tiennent compte */
  mountPath?: string;
  /** L'adresse de la page de paiement reprend l'origine du `return_url` (le site public) au lieu de l'adresse d'écoute */
  pageOriginFromReturnUrl?: boolean;
}

export interface MockOrangeRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: any;
}

export function createMockOrange(options: MockOrangeOptions = {}) {
  const clientId = options.clientId ?? 'test-client';
  const clientSecret = options.clientSecret ?? 'test-secret';
  const merchantKey = options.merchantKey ?? 'test-merchant';
  const country = options.country ?? 'dev';
  const currency = options.currency ?? 'OUV';
  const mountPath = (options.mountPath ?? '').replace(/\/+$/, '');
  const requests: MockOrangeRequest[] = [];
  const sessions = new Map<string, MockOrangeSession>();
  const tokens = new Set<string>();
  let tokenCounter = 0;
  let baseUrl = '';
  let failNextSession = false;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use((req, _res, next) => {
    if (options.recordRequests !== false) requests.push({ method: req.method, path: req.path, headers: { ...req.headers }, body: req.body });
    next();
  });

  app.post('/oauth/v3/token', (req, res) => {
    const expected = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
    if (req.headers.authorization !== expected) return res.status(401).json({ error: 'invalid_client' });
    if (req.body?.grant_type !== 'client_credentials') return res.status(400).json({ error: 'invalid_request' });
    const token = `orange-token-${++tokenCounter}`;
    tokens.add(token);
    res.json({ token_type: 'Bearer', access_token: token, expires_in: 7776000 });
  });

  const requireToken: express.RequestHandler = (req, res, next) => {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token || !tokens.has(token)) return res.status(401).json({ code: 41, message: 'Expired credentials', description: 'The access token provided is invalid' });
    next();
  };

  const BASE = `/orange-money-webpay/${country}/v1`;

  app.post(`${BASE}/webpayment`, requireToken, (req, res) => {
    const b = req.body ?? {};
    if (failNextSession) {
      failNextSession = false;
      return res.status(500).json({ code: 500, message: 'Internal error' });
    }
    if (b.merchant_key !== merchantKey) return res.status(401).json({ code: 42, message: 'Invalid merchant key' });
    if (b.currency !== currency) return res.status(400).json({ code: 43, message: `Invalid currency (expected ${currency})` });
    if (typeof b.order_id !== 'string' || !b.order_id || b.order_id.length > 30) {
      return res.status(400).json({ code: 44, message: 'Invalid order_id (max 30 characters)' });
    }
    if (!Number.isInteger(b.amount) || b.amount <= 0) return res.status(400).json({ code: 45, message: 'Invalid amount' });
    for (const field of ['return_url', 'cancel_url', 'notif_url']) {
      if (typeof b[field] !== 'string' || !/^https?:\/\//.test(b[field])) return res.status(400).json({ code: 46, message: `Invalid ${field}` });
    }

    const session: MockOrangeSession = {
      payToken: randomUUID().replace(/-/g, ''),
      notifToken: randomUUID().replace(/-/g, ''),
      orderId: b.order_id,
      amount: b.amount,
      currency: b.currency,
      returnUrl: b.return_url,
      cancelUrl: b.cancel_url,
      notifUrl: b.notif_url,
      status: 'PENDING',
    };
    sessions.set(session.payToken, session);
    res.status(201).json({
      status: 201,
      message: 'OK',
      pay_token: session.payToken,
      payment_url: `${options.pageOriginFromReturnUrl ? new URL(session.returnUrl).origin + mountPath : baseUrl}/pay/${session.payToken}`,
      notif_token: session.notifToken,
    });
  });

  app.post(`${BASE}/transactionstatus`, requireToken, (req, res) => {
    const b = req.body ?? {};
    const session = sessions.get(b.pay_token);
    if (!session || session.orderId !== b.order_id) return res.status(404).json({ code: 47, message: 'Unknown transaction' });
    if (b.amount !== session.amount) return res.status(400).json({ code: 48, message: 'Amount does not match the transaction' });
    res.json({ status: session.status, order_id: session.orderId, txnid: session.txnid });
  });

  function resolve(payToken: string, outcome: 'SUCCESS' | 'FAILED') {
    const session = sessions.get(payToken);
    if (!session || session.status !== 'PENDING') return;
    session.status = outcome;
    if (outcome === 'SUCCESS') session.txnid = `MP${Math.floor(1e9 + Math.random() * 9e9)}`;
    // Notification d'Orange (non signée) : le site ne doit s'en servir que comme déclencheur
    fetch(session.notifUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: outcome, notif_token: session.notifToken, txnid: session.txnid }),
    }).catch(() => undefined);
  }

  // --- Page de paiement d'Orange (simulée) ---
  app.get('/pay/:payToken', (req, res) => {
    const session = sessions.get(req.params.payToken);
    if (!session) return res.status(404).send('Session inconnue');
    res.type('html').send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orange Money (simulation)</title></head>
<body style="font-family:sans-serif;max-width:420px;margin:40px auto;padding:0 16px">
<h1 style="color:#f60">Orange Money <small style="font-size:14px">(simulation)</small></h1>
<p>Commande <b id="order">${session.orderId}</b><br>Montant : <b id="amount">${session.amount}</b> ${session.currency}</p>
<form method="post" action="${mountPath}/pay/${session.payToken}/success"><button id="pay" style="width:100%;padding:12px;background:#f60;color:#fff;border:0;font-size:16px">Payer</button></form>
<form method="post" action="${mountPath}/pay/${session.payToken}/failed" style="margin-top:12px"><button id="cancel" style="width:100%;padding:12px;font-size:16px">Annuler</button></form>
</body></html>`);
  });

  app.post('/pay/:payToken/:outcome', (req, res) => {
    const session = sessions.get(req.params.payToken);
    if (!session) return res.status(404).send('Session inconnue');
    const success = req.params.outcome === 'success';
    resolve(session.payToken, success ? 'SUCCESS' : 'FAILED');
    res.redirect(303, success ? session.returnUrl : session.cancelUrl);
  });

  let server: Server | null = null;
  return {
    app,
    requests,
    sessions,
    /** Simule le paiement (ou l'échec) fait par le client sur la page d'Orange */
    resolveSession: resolve,
    /** Fait échouer (HTTP 500) la prochaine création de session */
    failNextSession() {
      failNextSession = true;
    },
    /** Invalide tous les jetons émis (simule une expiration côté Orange) */
    revokeTokens() {
      tokens.clear();
    },
    tokenCount: () => tokenCounter,
    async listen(port = 0): Promise<{ url: string; port: number }> {
      await new Promise<void>((done) => {
        server = app.listen(port, '127.0.0.1', () => done());
      });
      const actual = (server!.address() as { port: number }).port;
      baseUrl = `http://127.0.0.1:${actual}`;
      return { url: baseUrl, port: actual };
    },
    async close(): Promise<void> {
      await new Promise<void>((done) => (server ? server.close(() => done()) : done()));
    },
  };
}
