import { FetchFn, OperatorError, isHttpUrl, operatorFetch } from './operatorHttp.js';

// Client de l'API « Orange Money Web Payment » (Orange Developer : https://developer.orange.com/apis/om-webpay).
//
// Différence avec MVola et Airtel : le client ne reçoit PAS de demande sur son téléphone. Le site l'envoie sur la
// page de paiement d'Orange (`payment_url`) ; il y saisit son numéro et son code ; Orange le renvoie sur notre
// site (`return_url`) puis notifie notre serveur (`notif_url`). Le site vérifie ensuite le résultat auprès d'Orange.
//
// Contrat implémenté :
//   POST {base}/oauth/v3/token                                          OAuth2 client_credentials (Basic)
//   POST {base}/orange-money-webpay/{pays}/v1/webpayment                -> { status:201, pay_token, payment_url, notif_token }
//   POST {base}/orange-money-webpay/{pays}/v1/transactionstatus         { order_id, amount, pay_token } -> { status: INITIATED|PENDING|EXPIRED|SUCCESS|FAILED, txnid }
//   {pays} : « dev » (bac à sable) ou le code du pays en production (« mg » pour Madagascar)
//
// À VALIDER dans le bac à sable d'Orange avec vos identifiants (voir OPERATEURS-INTEGRATION.md) : le code pays de
// production, la devise (« OUV » en bac à sable, « MGA » probable en production) et les champs exacts n'ont été
// confrontés qu'à un faux serveur qui reproduit ce contrat.

const DEFAULT_BASE_URL = 'https://api.orange.com';

export interface OrangeConfig {
  clientId: string;
  clientSecret: string;
  /** Clé marchande fournie par Orange */
  merchantKey: string;
  sandbox: boolean;
  baseUrl: string;
  /** « dev » en bac à sable ; « mg » (Madagascar) en production sauf indication contraire */
  country: string;
  /** « OUV » (Orange Universal Value) en bac à sable ; « MGA » en production sauf indication contraire */
  currency: string;
  language: 'fr' | 'en';
  /** Adresse publique du site (retour du client après le paiement) */
  siteUrl: string;
  /** Adresse publique HTTPS où Orange notifie le résultat */
  notifUrl: string;
}

// Configuration issue de l'environnement ; null tant que les identifiants et l'adresse publique du site ne sont pas renseignés
export function getOrangeConfig(env: NodeJS.ProcessEnv = process.env): OrangeConfig | null {
  const clientId = env.ORANGE_MONEY_CLIENT_ID?.trim();
  const clientSecret = env.ORANGE_MONEY_CLIENT_SECRET?.trim();
  const merchantKey = env.ORANGE_MONEY_MERCHANT_KEY?.trim();
  const siteUrl = (env.PUBLIC_SITE_URL?.trim() || env.FRONTEND_URL?.trim() || '').replace(/\/+$/, '');
  if (!clientId || !clientSecret || !merchantKey || !isHttpUrl(siteUrl)) return null;

  const sandbox = (env.ORANGE_MONEY_ENV ?? 'sandbox').trim().toLowerCase() !== 'production';
  return {
    clientId,
    clientSecret,
    merchantKey,
    sandbox,
    baseUrl: (env.ORANGE_MONEY_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    country: env.ORANGE_MONEY_COUNTRY?.trim().toLowerCase() || (sandbox ? 'dev' : 'mg'),
    currency: env.ORANGE_MONEY_CURRENCY?.trim().toUpperCase() || (sandbox ? 'OUV' : 'MGA'),
    language: env.ORANGE_MONEY_LANGUAGE?.trim().toLowerCase() === 'en' ? 'en' : 'fr',
    siteUrl,
    notifUrl: env.ORANGE_MONEY_NOTIF_URL?.trim() || `${siteUrl}/api/payments/auto/callback/orange_money`,
  };
}

export type OrangeStatus = 'pending' | 'completed' | 'failed';

// Statuts Orange -> statuts du site. Tout statut inconnu reste « pending » (jamais de validation sur une supposition).
export function mapOrangeStatus(status: unknown): OrangeStatus {
  switch (typeof status === 'string' ? status.toUpperCase() : '') {
    case 'SUCCESS':
    case 'SUCCESSFUL':
      return 'completed';
    case 'FAILED':
    case 'EXPIRED':
    case 'CANCELLED':
    case 'CANCELED':
      return 'failed';
    default:
      return 'pending';
  }
}

export interface OrangeInitiateResult {
  payToken: string;
  paymentUrl: string;
  notifToken?: string;
}

export class OrangeMoneyClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly config: OrangeConfig,
    private readonly fetchFn: FetchFn = fetch
  ) {}

  private async authenticate(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;

    const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const data = await operatorFetch(
      this.fetchFn,
      `${this.config.baseUrl}/oauth/v3/token`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      },
      'Orange Money'
    );
    const value = typeof data?.access_token === 'string' ? data.access_token : null;
    if (!value) throw new OperatorError('Réponse d’authentification Orange Money invalide');
    const expiresIn = Number(data.expires_in);
    this.token = { value, expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600) * 1000 };
    return value;
  }

  // Appel authentifié ; un jeton refusé (401) est renouvelé une fois
  private async call(path: string, body: unknown): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      const token = await this.authenticate();
      try {
        return await operatorFetch(
          this.fetchFn,
          `${this.config.baseUrl}/orange-money-webpay/${this.config.country}/v1${path}`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
          'Orange Money'
        );
      } catch (error) {
        if (error instanceof OperatorError && error.status === 401 && attempt === 0) {
          this.token = null;
          continue;
        }
        throw error;
      }
    }
  }

  // Crée la session de paiement : renvoie l'adresse de la page Orange où envoyer le client
  async initiate(params: {
    orderId: string;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<OrangeInitiateResult> {
    if (!Number.isInteger(params.amount) || params.amount <= 0) throw new OperatorError('Montant invalide');

    const data = await this.call('/webpayment', {
      merchant_key: this.config.merchantKey,
      currency: this.config.currency,
      order_id: params.orderId,
      amount: params.amount,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
      notif_url: this.config.notifUrl,
      lang: this.config.language,
      reference: params.description.slice(0, 50),
    });

    const payToken = typeof data?.pay_token === 'string' ? data.pay_token : null;
    if (!payToken || !isHttpUrl(data?.payment_url)) {
      throw new OperatorError('Réponse Orange Money invalide (page de paiement manquante)');
    }
    return { payToken, paymentUrl: data.payment_url, notifToken: typeof data.notif_token === 'string' ? data.notif_token : undefined };
  }

  // État d'une session de paiement (le montant fait partie de la requête : un montant différent n'est jamais validé)
  async getStatus(params: { orderId: string; amount: number; payToken: string }): Promise<{ status: OrangeStatus; transactionId?: string }> {
    const data = await this.call('/transactionstatus', { order_id: params.orderId, amount: params.amount, pay_token: params.payToken });
    return {
      status: mapOrangeStatus(data?.status),
      transactionId: typeof data?.txnid === 'string' && data.txnid ? data.txnid : undefined,
    };
  }
}

let shared: { key: string; client: OrangeMoneyClient } | null = null;
export function getOrangeClient(): OrangeMoneyClient | null {
  const config = getOrangeConfig();
  if (!config) return null;
  const key = JSON.stringify(config);
  if (!shared || shared.key !== key) shared = { key, client: new OrangeMoneyClient(config) };
  return shared.client;
}
