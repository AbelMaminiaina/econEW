'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatPrice, formatQuantity } from '@/lib/utils';
import { getSellerOrders, updateSellerOrderStatus, type SellerOrder } from '@/lib/api/seller';

const statusLabel: Record<SellerOrder['status'], { label: string; className: string }> = {
  pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmée', className: 'bg-blue-100 text-blue-800' },
  processing: { label: 'En préparation', className: 'bg-indigo-100 text-indigo-800' },
  shipped: { label: 'Expédiée', className: 'bg-purple-100 text-purple-800' },
  delivered: { label: 'Livrée', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulée', className: 'bg-red-100 text-red-800' },
};

// Étape suivante du traitement d'une commande (le vendeur fait avancer ses propres commandes)
const nextStep: Partial<Record<SellerOrder['status'], { to: SellerOrder['status']; label: string }>> = {
  pending: { to: 'confirmed', label: 'Confirmer' },
  confirmed: { to: 'processing', label: 'Mettre en préparation' },
  processing: { to: 'shipped', label: 'Marquer expédiée' },
  shipped: { to: 'delivered', label: 'Marquer livrée' },
};

export default function SellerOrdersPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setOrders((await getSellerOrders(token)).orders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (order: SellerOrder, status: SellerOrder['status'], reason?: string) => {
    if (!token) return;
    setBusy(order.id);
    try {
      await updateSellerOrderStatus(order.id, status, token, reason);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="h-40 animate-pulse rounded-xl bg-white" />;

  return (
    <div>
      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-xl bg-white p-12 text-center text-warm-600">
          Aucune commande reçue pour le moment.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const st = statusLabel[order.status];
            const step = nextStep[order.status];
            const closed = order.status === 'delivered' || order.status === 'cancelled';
            const paid = order.paymentStatus === 'paid';
            return (
              <div key={order.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-warm-800">{order.orderNumber}</h2>
                    <p className="text-sm text-warm-500">{new Date(order.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                    >
                      {paid ? 'Payée' : order.paymentStatus === 'submitted' ? 'Paiement en vérification' : 'Paiement en attente'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${st.className}`}>{st.label}</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="text-sm text-warm-600">
                    <p className="font-medium text-warm-800">
                      {order.buyerName} <span className="font-normal">({order.buyerType})</span>
                    </p>
                    {order.contactEmail && <p>{order.contactEmail}</p>}
                    {order.contactPhone && <p>{order.contactPhone}</p>}
                    <p className="mt-2">
                      {order.deliveryMethod === 'retrait'
                        ? 'Retrait sur place'
                        : order.address
                          ? `${order.address.street}, ${order.address.city} ${order.address.postalCode}`
                          : 'Adresse non renseignée'}
                    </p>
                    {order.notes && <p className="mt-2 italic">« {order.notes} »</p>}
                    {order.cancelReason && <p className="mt-2 text-red-600">Annulation : {order.cancelReason}</p>}
                  </div>
                  <ul className="space-y-1 text-sm">
                    {order.items.map((item, i) => (
                      <li key={i} className="flex justify-between gap-4">
                        <span className="text-warm-700">
                          {item.name} × {formatQuantity(item.quantity, 'pièce')}
                        </span>
                        <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between border-t pt-1 text-warm-600">
                      <span>Livraison</span>
                      <span>{order.shippingCost === 0 ? 'Gratuite' : formatPrice(order.shippingCost)}</span>
                    </li>
                    <li className="flex justify-between font-semibold text-warm-800">
                      <span>Total</span>
                      <span>{formatPrice(order.total)}</span>
                    </li>
                  </ul>
                </div>

                {!closed && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                    {step && !paid && (
                      <p className="w-full text-sm text-warm-500">
                        À préparer une fois le paiement confirmé par la plateforme.
                      </p>
                    )}
                    {step && paid && (
                      <button
                        type="button"
                        disabled={busy === order.id}
                        onClick={() => change(order, step.to)}
                        className="rounded-lg bg-prairie-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {step.label}
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy === order.id}
                      onClick={() => {
                        const reason = window.prompt('Motif de l’annulation (facultatif) :');
                        if (reason !== null) change(order, 'cancelled', reason || undefined);
                      }}
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
