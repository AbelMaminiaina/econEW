import { fetchAPI } from './config';

// Paiement Mobile Money vérifié manuellement : le client envoie le montant au numéro marchand puis
// saisit la référence de sa transaction ; un administrateur confirme ou refuse.
// Une carte bancaire nécessitera un prestataire de paiement (voir backend/src/lib/payments.ts).

export type PaymentMethodId = 'mvola' | 'orange_money' | 'airtel_money';
export type PaymentStatus = 'awaiting' | 'submitted' | 'paid' | 'rejected';

export interface PaymentMethodInfo {
  id: PaymentMethodId;
  label: string;
  number: string;
  accountName: string;
}

export interface PaymentSummary {
  paymentStatus: PaymentStatus;
  method: PaymentMethodId | null;
  methodLabel: string | null;
  number: string | null;
  accountName: string | null;
  totalAmount: number;
  reference: string | null;
  payerPhone: string | null;
  submittedAt: string | null;
  paidAt: string | null;
  rejectionReason: string | null;
  orders: {
    orderNumber: string;
    sellerName: string | null;
    total: number;
    status: string;
    paymentStatus: PaymentStatus;
  }[];
}

export interface AdminPayment extends PaymentSummary {
  id: string;
  buyer: { name: string; email: string | null; phone: string | null };
  createdAt: string;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  awaiting: 'En attente de paiement',
  submitted: 'Paiement à vérifier',
  paid: 'Paiement confirmé',
  rejected: 'Paiement refusé',
};

export async function getPaymentMethods(): Promise<PaymentMethodInfo[]> {
  const data = await fetchAPI<{ methods: PaymentMethodInfo[] }>('/payments/methods');
  return data.methods;
}

// `email` : visiteur sans compte (celui saisi à la commande) ; `token` : client connecté
export async function getPaymentStatus(
  orderNumber: string,
  opts: { email?: string; token?: string } = {}
): Promise<PaymentSummary> {
  const params = new URLSearchParams({ orderNumber });
  if (opts.email) params.set('email', opts.email);
  return fetchAPI<PaymentSummary>(`/payments/status?${params.toString()}`, { token: opts.token });
}

export async function submitPayment(
  data: { orderNumber: string; reference: string; payerPhone: string; email?: string },
  token?: string
): Promise<{ success: boolean; message: string }> {
  return fetchAPI('/payments/submit', { method: 'POST', body: JSON.stringify(data), token });
}

export async function getAdminPayments(
  token: string,
  status: PaymentStatus | 'all' = 'submitted'
): Promise<{ payments: AdminPayment[] }> {
  return fetchAPI(`/payments/admin?status=${status}`, { token });
}

export async function confirmPayment(orderId: string, token: string): Promise<{ success: boolean }> {
  return fetchAPI(`/payments/admin/${orderId}/confirm`, { method: 'PATCH', token });
}

export async function rejectPayment(orderId: string, reason: string, token: string): Promise<{ success: boolean }> {
  return fetchAPI(`/payments/admin/${orderId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
    token,
  });
}
