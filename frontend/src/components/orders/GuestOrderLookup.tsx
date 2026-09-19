'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { trackGuestOrder, type GuestOrder } from '@/lib/api/checkout';
import { PaymentPanel } from '@/components/orders/PaymentPanel';

const statusLabels: Record<GuestOrder['status'], { label: string; description: string; className: string }> = {
  pending: { label: 'En attente', description: 'Votre commande démarre dès que votre paiement est confirmé.', className: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmée', description: 'Votre commande a été confirmée.', className: 'bg-blue-100 text-blue-800' },
  processing: { label: 'En préparation', description: 'Votre commande est en cours de préparation.', className: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'Expédiée', description: 'Votre commande est en route.', className: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Livrée', description: 'Commande livrée avec succès.', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulée', description: 'Cette commande a été annulée.', className: 'bg-red-100 text-red-800' },
};

const deliveryLabels: Record<string, string> = {
  standard: 'Livraison standard',
  express: 'Livraison express',
  retrait: 'Retrait sur place',
};

// Suivi d'une commande passée sans compte : numéro de commande + e-mail saisi au paiement.
export function GuestOrderLookup() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<GuestOrder | null>(null);
  // E-mail utilisé pour la recherche (le champ peut être modifié ensuite sans relancer le paiement)
  const [searchedEmail, setSearchedEmail] = useState('');

  // Pré-remplissage depuis le lien de la page de confirmation (?order=...&email=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preOrder = params.get('order');
    const preEmail = params.get('email');
    if (preOrder) setOrderNumber(preOrder.split(',')[0]);
    if (preEmail) setEmail(preEmail);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      setOrder(await trackGuestOrder(orderNumber.trim(), email.trim()));
      setSearchedEmail(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de retrouver la commande');
    } finally {
      setLoading(false);
    }
  };

  const status = order ? statusLabels[order.status] : null;

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-warm-200 bg-white p-6 text-left shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-warm-800">Commande passée sans compte ?</h2>
      <p className="mb-4 text-sm text-warm-600">
        Retrouvez-la avec son numéro et l&apos;adresse e-mail saisie à la commande.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Numéro de commande"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="ORD-XXXXXXXX-XXXXXX"
          required
        />
        <Input
          label="Adresse e-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jean@exemple.mg"
          required
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" fullWidth loading={loading} icon={<Search className="h-4 w-4" />}>
          Suivre ma commande
        </Button>
      </form>

      {order && status && (
        <div className="mt-6 border-t border-warm-100 pt-6" aria-live="polite">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-warm-800">{order.orderNumber}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>{status.label}</span>
          </div>
          <p className="mb-4 text-sm text-warm-600">{status.description}</p>
          {order.cancelReason && <p className="mb-4 text-sm text-red-600">Motif : {order.cancelReason}</p>}
          <ul className="mb-3 space-y-1 text-sm">
            {order.items.map((item, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span className="text-warm-700">
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-warm-100 pt-2 text-sm text-warm-600">
            <span>Livraison ({deliveryLabels[order.deliveryMethod] ?? order.deliveryMethod})</span>
            <span>{order.shippingCost === 0 ? 'Gratuite' : formatPrice(order.shippingCost)}</span>
          </div>
          <div className="flex justify-between font-semibold text-warm-800">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
          {order.sellerName && <p className="mt-2 text-xs text-warm-500">Vendu par {order.sellerName}</p>}
          <div className="mt-4">
            <PaymentPanel orderNumber={order.orderNumber} email={searchedEmail} />
          </div>
        </div>
      )}
    </div>
  );
}

export default GuestOrderLookup;
