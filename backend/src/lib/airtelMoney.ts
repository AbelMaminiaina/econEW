import { FetchFn, OperatorError, operatorFetch } from './operatorHttp.js';
import { isAirtelNumber, normalizeMalagasyMobile } from './phone.js';

// Client de l'API « Collections » d'Airtel Money (Airtel Africa Open API : https://developers.airtel.africa).
// Comme MVola : le site demande le paiement, le client reçoit une demande sur son téléphone (USSD push) et la
// confirme avec son code secret, puis le site interroge Airtel pour connaître le résultat.
//
// Contrat implémenté :
//   POST {base}/auth/oauth2/token                    { client_id, client_secret, grant_type } -> { access_token, expires_in }
//   POST {base}/merchant/v1/payments/                demande de paiement (en-têtes X-Country, X-Currency)
//   GET  {base}/standard/v1/payments/{transaction.id}  -> data.transaction.status : TS payé | TF échec | TIP en cours | TA ambigu | TE expiré
//   base : https://openapiuat.airtel.africa (essai) ou https://openapi.airtel.africa (production)
//
// À VALIDER dans le bac à sable d'Airtel avec vos identifiants (voir OPERATEURS-INTEGRATION.md) : une application est
// propre à chaque pays (Madagascar), et le format du numéro, la longueur maximale de l'identifiant de transaction et
// les réponses d'erreur n'ont été confrontés qu'à un faux serveur qui reproduit ce contrat.

const SANDBOX_URL = 'https://openapiuat.airtel.africa';
const PRODUCTION_URL = 'https://openapi.airtel.africa';
const COUNTRY = 'MG';
const CURRENCY = 'MGA';

export interface AirtelConfig {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
  baseUrl: string;
}

// Configuration issue de l'environnement ; null tant que les identifiants ne sont pas renseignés
export function getAirtelConfig(env: NodeJS.ProcessEnv = process.env): AirtelConfig | null {
  const clientId = env.AIRTEL_MONEY_CLIENT_ID?.trim();
  const clientSecret = env.AIRTEL_MONEY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const sandbox = (env.AIRTEL_MONEY_ENV ?? 'sandbox').trim().toLowerCase() !== 'production';
  return {
    clientId,
    clientSecret,
    sandbox,
    baseUrl: (env.AIRTEL_MONEY_API_BASE_URL?.trim() || (sandbox ? SANDBOX_URL : PRODUCTION_URL)).replace(/\/+$/, ''),
  };
}

export type AirtelStatus = 'pending' | 'completed' | 'failed';

// Statuts Airtel -> statuts du site. « TA » (ambigu) et tout statut inconnu restent « pending » : jamais de validation
// sur un doute.
export function mapAirtelStatus(status: unknown): AirtelStatus {
  switch (typeof status === 'string' ? status.toUpperCase() : '') {
    case 'TS':
    case 'SUCCESS':
    case 'SUCCESSFUL':
      return 'completed';
    case 'TF':
    case 'TE':
    case 'FAILED':
    case 'EXPIRED':
      return 'failed';
    default:
      return 'pending';
  }
}

export class AirtelMoneyClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly config: AirtelConfig,
    private readonly fetchFn: FetchFn = fetch
  ) {}

  private async authenticate(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;

    const data = await operatorFetch(
      this.fetchFn,
      `${this.config.baseUrl}/auth/oauth2/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: '*/*' },
        body: JSON.stringify({ client_id: this.config.clientId, client_secret: this.config.clientSecret, grant_type: 'client_credentials' }),
      },
      'Airtel Money'
    );
    const value = typeof data?.access_token === 'string' ? data.access_token : null;
    if (!value) throw new OperatorError('Réponse d’authentification Airtel Money invalide');
    const expiresIn = Number(data.expires_in);
    this.token = { value, expiresAt: Date.now() + (Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 180) * 1000 };
    return value;
  }

  // Appel authentifié ; un jeton refusé (401) est renouvelé une fois. Airtel répond parfois 200 avec une erreur logique
  // (`status.success: false`) : elle est convertie en erreur non réessayable.
  private async call(method: 'GET' | 'POST', path: string, body?: unknown): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      const token = await this.authenticate();
      try {
        const data = await operatorFetch(
          this.fetchFn,
          `${this.config.baseUrl}${path}`,
          {
            method,
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
              Accept: '*/*',
              'X-Country': COUNTRY,
              'X-Currency': CURRENCY,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
          },
          'Airtel Money'
        );
        if (data?.status?.success === false) {
          throw new OperatorError(`Airtel Money : ${String(data.status.message ?? data.status.code ?? 'demande refusée').slice(0, 200)}`);
        }
        return data;
      } catch (error) {
        if (error instanceof OperatorError && error.status === 401 && attempt === 0) {
          this.token = null;
          continue;
        }
        throw error;
      }
    }
  }

  // Demande de paiement : Airtel envoie une notification au téléphone du client
  async initiate(params: { transactionId: string; amount: number; payerNumber: string }): Promise<{ transactionId: string; status: AirtelStatus }> {
    const payer = normalizeMalagasyMobile(params.payerNumber);
    if (!payer || !isAirtelNumber(payer)) throw new OperatorError('Numéro Airtel Money invalide (033)');
    if (!Number.isInteger(params.amount) || params.amount <= 0) throw new OperatorError('Montant invalide');

    const data = await this.call('POST', '/merchant/v1/payments/', {
      reference: params.transactionId,
      subscriber: {
        country: COUNTRY,
        currency: CURRENCY,
        msisdn: payer.slice(1), // format Airtel : sans le 0 initial (33XXXXXXX)
      },
      transaction: { amount: params.amount, country: COUNTRY, currency: CURRENCY, id: params.transactionId },
    });

    const transaction = data?.data?.transaction;
    return {
      transactionId: typeof transaction?.id === 'string' && transaction.id ? transaction.id : params.transactionId,
      status: mapAirtelStatus(transaction?.status),
    };
  }

  // État d'une demande de paiement
  async getStatus(transactionId: string): Promise<{ status: AirtelStatus; airtelMoneyId?: string }> {
    const data = await this.call('GET', `/standard/v1/payments/${encodeURIComponent(transactionId)}`);
    const transaction = data?.data?.transaction;
    return {
      status: mapAirtelStatus(transaction?.status),
      airtelMoneyId: typeof transaction?.airtel_money_id === 'string' && transaction.airtel_money_id ? transaction.airtel_money_id : undefined,
    };
  }
}

let shared: { key: string; client: AirtelMoneyClient } | null = null;
export function getAirtelClient(): AirtelMoneyClient | null {
  const config = getAirtelConfig();
  if (!config) return null;
  const key = JSON.stringify(config);
  if (!shared || shared.key !== key) shared = { key, client: new AirtelMoneyClient(config) };
  return shared.client;
}
