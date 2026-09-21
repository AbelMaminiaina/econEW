// Annulation automatique des commandes non payées : une commande « en attente de paiement » réserve du
// stock ; sans délai limite, un client qui ne paie jamais bloquerait le catalogue indéfiniment.
//
//  - Délai : UNPAID_ORDER_EXPIRY_HOURS (défaut 48 h ; 0 = jamais d'annulation automatique).
//  - Concerne uniquement les commandes en attente SANS référence de paiement à vérifier :
//    « awaiting » (le client n'a rien envoyé) et « rejected » (paiement refusé). Une commande dont le
//    client a transmis une référence (« submitted ») n'est jamais annulée automatiquement.
//  - Décompte : depuis la création de la commande ; pour un paiement refusé, depuis le refus (le client
//    dispose alors d'un nouveau délai complet pour saisir une autre référence).

export const DEFAULT_UNPAID_EXPIRY_HOURS = 48;
const MAX_UNPAID_EXPIRY_HOURS = 24 * 30;
export const EXPIRY_CANCEL_REASON = 'Non payée dans le délai imparti';

export function unpaidOrderExpiryHours(): number {
  const raw = process.env.UNPAID_ORDER_EXPIRY_HOURS;
  if (raw === undefined || raw.trim() === '') return DEFAULT_UNPAID_EXPIRY_HOURS;
  const parsed = Number(raw.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_UNPAID_EXPIRY_HOURS) return DEFAULT_UNPAID_EXPIRY_HOURS;
  return parsed;
}

interface ExpirableOrder {
  status: string;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

// Date limite de paiement d'une commande, ou null si elle n'est pas concernée (payée, à vérifier,
// annulée, avancée…) ou si l'annulation automatique est désactivée.
export function orderExpiresAt(order: ExpirableOrder, hours = unpaidOrderExpiryHours()): Date | null {
  if (hours <= 0 || order.status !== 'pending') return null;
  if (order.paymentStatus !== 'awaiting' && order.paymentStatus !== 'rejected') return null;
  const start = order.paymentStatus === 'rejected' ? order.updatedAt : order.createdAt;
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
}
