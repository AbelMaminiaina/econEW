import type { PaymentAttempt } from '@prisma/client';
import { getMvolaClient, getMvolaConfig } from './mvola.js';
import { getOrangeClient, getOrangeConfig } from './orangeMoney.js';
import { getAirtelClient, getAirtelConfig } from './airtelMoney.js';
import { OperatorError } from './operatorHttp.js';
import { isAirtelNumber, isMvolaNumber, isOrangeNumber, normalizeMalagasyMobile } from './phone.js';

// Registre des opérateurs Mobile Money branchés sur leur API. Chaque adaptateur cache les différences de contrat
// (MVola et Airtel : demande sur le téléphone du client ; Orange : page de paiement d'Orange) derrière la même
// interface, ce qui permet au service de paiement (services/mobileMoneyPayments.ts) d'être unique.

export type OperatorId = 'mvola' | 'orange_money' | 'airtel_money';
export type ProviderStatus = 'pending' | 'completed' | 'failed';

export interface OperatorInitiateInput {
  attemptId: string;
  amount: number;
  orderNumber: string;
  /** Numéro du client au format local (vide pour un opérateur à redirection) */
  payerNumber: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface OperatorInitiateResult {
  /** Identifiant de suivi chez l'opérateur (sert à interroger l'état) */
  trackingId: string;
  transactionId?: string;
  /** Page de paiement de l'opérateur où envoyer le client (opérateurs à redirection) */
  paymentUrl?: string;
  notifToken?: string;
  status: ProviderStatus;
}

export interface OperatorAdapter {
  id: OperatorId;
  label: string;
  /** push : le client confirme sur son téléphone ; redirect : le client est envoyé sur la page de l'opérateur */
  flow: 'push' | 'redirect';
  /** Préfixe de `Order.paymentReference` pour un paiement piloté par l'API */
  referencePrefix: string;
  /** Préfixes de numéro acceptés, pour l'affichage (« 034 ou 038 ») */
  phonePrefixes: string;
  phonePlaceholder: string;
  /** Délai sans confirmation du client au-delà duquel la demande est abandonnée */
  pendingTtlMs: number;
  isConfigured(): boolean;
  isValidPayer(localNumber: string): boolean;
  initiate(input: OperatorInitiateInput): Promise<OperatorInitiateResult>;
  getStatus(attempt: PaymentAttempt): Promise<{ status: ProviderStatus; transactionId?: string }>;
  /** Recoupements supplémentaires avant validation ; renvoie le problème constaté, ou null si tout concorde */
  verify?(attempt: PaymentAttempt, transactionId: string | null): Promise<string | null>;
  /** Conditions de recherche (Prisma `OR`) de la tentative visée par un message de rappel non signé */
  callbackLookup(body: Record<string, unknown>): object[];
  /** Vrai si l'erreur signifie « transaction inconnue chez l'opérateur » */
  isUnknownTransaction(error: unknown): boolean;
}

const short = (v: unknown) => (typeof v === 'string' && v.length > 0 && v.length <= 100 ? v : undefined);
const notFound = (error: unknown) => error instanceof OperatorError && error.status === 404;

// Identifiant de commande envoyé à l'opérateur : l'identifiant de la tentative sans tirets (32 caractères, limité à 30)
export const compactId = (attemptId: string) => attemptId.replace(/-/g, '').slice(0, 30);

const mvola: OperatorAdapter = {
  id: 'mvola',
  label: 'MVola',
  flow: 'push',
  referencePrefix: 'MVOLA:',
  phonePrefixes: '034 ou 038',
  phonePlaceholder: '034 12 345 67',
  pendingTtlMs: 15 * 60 * 1000,
  isConfigured: () => getMvolaConfig() !== null,
  isValidPayer: isMvolaNumber,
  async initiate(input) {
    const client = getMvolaClient();
    if (!client) throw new OperatorError('MVola non configuré');
    const started = await client.initiate({
      amount: input.amount,
      reference: input.attemptId,
      description: `Commande ${input.orderNumber}`,
      payerNumber: input.payerNumber,
    });
    return { trackingId: started.serverCorrelationId, transactionId: started.objectReference, status: started.status };
  },
  async getStatus(attempt) {
    const client = getMvolaClient();
    if (!client || !attempt.serverCorrelationId) throw new OperatorError('MVola non configuré');
    const result = await client.getStatus(attempt.serverCorrelationId);
    return { status: result.status, transactionId: result.objectReference };
  },
  // MVola fournit le détail de la transaction : on recoupe statut, montant et compte crédité
  async verify(attempt, transactionId) {
    if (!transactionId) return null;
    const client = getMvolaClient();
    const merchant = getMvolaConfig()?.merchantNumber;
    const details = client ? await client.getTransaction(transactionId).catch(() => null) : null;
    if (!details) return null;
    if (details.status === 'failed') return 'MVola indique un échec dans le détail de la transaction';
    if (details.amount !== attempt.amount) return `Montant reçu ${details.amount} Ar au lieu de ${attempt.amount} Ar`;
    if (details.creditMsisdn && merchant && normalizeMalagasyMobile(details.creditMsisdn) !== merchant) {
      return 'Le compte crédité n’est pas celui de la plateforme';
    }
    return null;
  },
  callbackLookup(body) {
    return [
      short(body.serverCorrelationId) && { serverCorrelationId: short(body.serverCorrelationId) },
      short(body.requestingOrganisationTransactionReference) && { id: short(body.requestingOrganisationTransactionReference) },
      short(body.objectReference) && { transactionId: short(body.objectReference) },
    ].filter(Boolean) as object[];
  },
  isUnknownTransaction: notFound,
};

const orange: OperatorAdapter = {
  id: 'orange_money',
  label: 'Orange Money',
  flow: 'redirect',
  referencePrefix: 'ORANGE_MONEY:',
  phonePrefixes: '032 ou 037',
  phonePlaceholder: '032 12 345 67',
  // Le client saisit son code sur la page d'Orange, qui gère elle-même l'expiration de la session : marge plus large
  pendingTtlMs: 30 * 60 * 1000,
  isConfigured: () => getOrangeConfig() !== null,
  isValidPayer: isOrangeNumber,
  async initiate(input) {
    const client = getOrangeClient();
    if (!client) throw new OperatorError('Orange Money non configuré');
    const session = await client.initiate({
      orderId: compactId(input.attemptId),
      amount: input.amount,
      description: `Commande ${input.orderNumber}`,
      returnUrl: input.returnUrl,
      cancelUrl: input.cancelUrl,
    });
    return { trackingId: session.payToken, paymentUrl: session.paymentUrl, notifToken: session.notifToken, status: 'pending' };
  },
  async getStatus(attempt) {
    const client = getOrangeClient();
    if (!client || !attempt.serverCorrelationId) throw new OperatorError('Orange Money non configuré');
    // Le montant fait partie de la requête : si Orange a encaissé un autre montant, le statut n'est pas « SUCCESS »
    return client.getStatus({ orderId: compactId(attempt.id), amount: attempt.amount, payToken: attempt.serverCorrelationId });
  },
  callbackLookup(body) {
    return [short(body.notif_token) && { notifToken: short(body.notif_token) }].filter(Boolean) as object[];
  },
  isUnknownTransaction: notFound,
};

const airtel: OperatorAdapter = {
  id: 'airtel_money',
  label: 'Airtel Money',
  flow: 'push',
  referencePrefix: 'AIRTEL_MONEY:',
  phonePrefixes: '033',
  phonePlaceholder: '033 12 345 67',
  pendingTtlMs: 15 * 60 * 1000,
  isConfigured: () => getAirtelConfig() !== null,
  isValidPayer: isAirtelNumber,
  async initiate(input) {
    const client = getAirtelClient();
    if (!client) throw new OperatorError('Airtel Money non configuré');
    const started = await client.initiate({ transactionId: compactId(input.attemptId), amount: input.amount, payerNumber: input.payerNumber });
    return { trackingId: started.transactionId, status: started.status };
  },
  async getStatus(attempt) {
    const client = getAirtelClient();
    if (!client || !attempt.serverCorrelationId) throw new OperatorError('Airtel Money non configuré');
    const result = await client.getStatus(attempt.serverCorrelationId);
    return { status: result.status, transactionId: result.airtelMoneyId };
  },
  callbackLookup(body) {
    const transaction = (body.transaction ?? {}) as Record<string, unknown>;
    return [short(transaction.id) && { serverCorrelationId: short(transaction.id) }].filter(Boolean) as object[];
  },
  isUnknownTransaction: notFound,
};

export const OPERATORS: Record<OperatorId, OperatorAdapter> = { mvola, orange_money: orange, airtel_money: airtel };

export function getOperator(id: string | null | undefined): OperatorAdapter | null {
  return id && id in OPERATORS ? OPERATORS[id as OperatorId] : null;
}

// Opérateur dont l'API pilote le paiement d'une commande (null : paiement manuel par référence uniquement)
export function getAutomaticOperator(paymentMethod: string | null | undefined): OperatorAdapter | null {
  const operator = getOperator(paymentMethod);
  return operator && operator.isConfigured() ? operator : null;
}

// Vrai si la référence de paiement d'une commande a été posée par une API (et non saisie par le client)
export const isApiReference = (reference: string | null | undefined): boolean =>
  !!reference && Object.values(OPERATORS).some((o) => reference.startsWith(o.referencePrefix));
