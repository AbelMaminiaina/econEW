'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  Package,
  Clock,
  CheckCircle,
  Truck,
  MapPin,
  Phone,
  XCircle,
  ChevronRight,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { fadeInUp } from '@/lib/animations';
import { formatPrice } from '@/lib/utils';
import { getMyOrders } from '@/lib/api/checkout';
import { GuestOrderLookup } from '@/components/orders/GuestOrderLookup';
import { PaymentPanel } from '@/components/orders/PaymentPanel';
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '@/lib/api/payments';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  availableFrom?: string | null;
}

const paymentBadgeClass: Record<PaymentStatus, string> = {
  awaiting: 'bg-yellow-100 text-yellow-800',
  submitted: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function isReservation(availableFrom?: string | null): boolean {
  if (!availableFrom) return false;
  const d = new Date(availableFrom);
  return !Number.isNaN(d.getTime()) && d.getTime() > Date.now();
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  deliveryMethod: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  address?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  } | null;
  items: OrderItem[];
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode; description: string }> = {
  pending: {
    label: 'En attente de paiement',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: <Clock className="h-5 w-5" />,
    description: 'Votre commande démarre dès que votre paiement est confirmé.',
  },
  confirmed: {
    label: 'Confirmée',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: <CheckCircle className="h-5 w-5" />,
    description: 'Votre commande a été confirmée.',
  },
  processing: {
    label: 'En préparation',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: <Package className="h-5 w-5" />,
    description: 'Votre commande est en cours de préparation.',
  },
  shipped: {
    label: 'Expédiée',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    icon: <Truck className="h-5 w-5" />,
    description: 'Votre commande est en route.',
  },
  delivered: {
    label: 'Livrée',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: <CheckCircle className="h-5 w-5" />,
    description: 'Commande livrée avec succès.',
  },
  cancelled: {
    label: 'Annulée',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: <XCircle className="h-5 w-5" />,
    description: 'Cette commande a été annulée.',
  },
};

const deliveryLabels: Record<string, string> = {
  standard: 'Livraison standard',
  express: 'Livraison express',
  retrait: 'Retrait sur place',
};

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export default function MesCommandesPage() {
  const { data: session, status: authStatus } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (session?.accessToken) {
      fetchOrders(session.accessToken);
    } else if (authStatus !== 'loading') {
      setLoading(false);
    }
  }, [session, authStatus]);

  const fetchOrders = async (token: string) => {
    try {
      const data = await getMyOrders(token);
      const formattedOrders: Order[] = (data.orders || []).map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: order.subtotal,
        shippingCost: order.shippingCost,
        total: order.total,
        deliveryMethod: order.deliveryMethod,
        paymentStatus: order.paymentStatus ?? 'awaiting',
        createdAt: order.createdAt,
        address: order.address,
        items: (order.items || []).map((item: any) => ({
          name: item.name || 'Produit',
          quantity: item.quantity,
          price: item.price,
          availableFrom: item.availableFrom ?? null,
        })),
      }));
      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = (status: string) => statusSteps.indexOf(status);

  // Non connecté
  if (authStatus !== 'loading' && !session) {
    return (
      <div className="min-h-screen bg-cream-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-warm-100 flex items-center justify-center mx-auto mb-6">
              <User className="h-10 w-10 text-warm-400" />
            </div>
            <h1 className="text-2xl font-bold text-warm-800 mb-4">
              Connectez-vous pour voir vos commandes
            </h1>
            <p className="text-warm-600 mb-8">
              Accédez à l&apos;historique de toutes vos commandes et suivez leur statut en temps réel.
            </p>
            <Link href="/connexion">
              <Button size="lg">Se connecter</Button>
            </Link>
          </div>
          <GuestOrderLookup />
        </div>
      </div>
    );
  }

  // Chargement
  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-cream-50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prairie-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 py-12">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-4xl mx-auto"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-warm-800 mb-2">
              Mes commandes
            </h1>
            <p className="text-warm-600">
              Retrouvez l&apos;historique de toutes vos commandes
            </p>
          </div>

          {/* Liste des commandes */}
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-warm-100 flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="h-10 w-10 text-warm-400" />
              </div>
              <h2 className="text-xl font-semibold text-warm-800 mb-2">
                Aucune commande
              </h2>
              <p className="text-warm-600 mb-6">
                Vous n&apos;avez pas encore passé de commande.
              </p>
              <Link href="/produits">
                <Button>Découvrir nos produits</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, index) => {
                const status = statusConfig[order.status] || statusConfig.pending;
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedOrder(order)}
                    className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Infos commande */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-warm-800">
                            {order.orderNumber}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                            {status.icon}
                            {status.label}
                          </span>
                          {order.status !== 'cancelled' && order.paymentStatus !== 'paid' && (
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${paymentBadgeClass[order.paymentStatus]}`}>
                              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-warm-600">
                          <span>
                            {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                          <span>•</span>
                          <span>{order.items.length} article{order.items.length > 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{deliveryLabels[order.deliveryMethod] || order.deliveryMethod}</span>
                        </div>
                      </div>

                      {/* Prix et flèche */}
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-prairie-600">
                          {formatPrice(order.total)}
                        </span>
                        <ChevronRight className="h-5 w-5 text-warm-400 group-hover:text-prairie-600 transition-colors" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal détail commande */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-start md:items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl w-full max-w-2xl my-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header modal */}
              <div className="sticky top-0 bg-white border-b border-warm-100 p-4 sm:p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-warm-800">
                    {selectedOrder.orderNumber}
                  </h2>
                  <p className="text-sm text-warm-600">
                    {new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-warm-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-warm-600" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Statut avec progression */}
                {(() => {
                  const status = statusConfig[selectedOrder.status] || statusConfig.pending;
                  const stepIndex = currentStepIndex(selectedOrder.status);
                  return (
                    <div className={`rounded-xl p-4 sm:p-6 ${status.bgColor}`}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-full bg-white ${status.color}`}>
                          {status.icon}
                        </div>
                        <div>
                          <h3 className={`font-bold ${status.color}`}>{status.label}</h3>
                          <p className={`text-sm ${status.color} opacity-80`}>{status.description}</p>
                        </div>
                      </div>

                      {/* Barre de progression */}
                      {selectedOrder.status !== 'cancelled' && (
                        <div className="flex justify-between mt-4">
                          {statusSteps.map((step, index) => {
                            const isCompleted = index <= stepIndex;
                            const isCurrent = index === stepIndex;
                            return (
                              <div key={step} className="flex flex-col items-center flex-1">
                                <div
                                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium
                                    ${isCompleted ? 'bg-white text-prairie-600' : 'bg-white/40 text-warm-500'}`}
                                >
                                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : index + 1}
                                </div>
                                <span className={`text-[10px] sm:text-xs mt-1 text-center ${isCurrent ? 'font-semibold' : ''} ${status.color}`}>
                                  <span className="hidden sm:inline">{statusConfig[step].label}</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Livraison */}
                <div className="flex items-center gap-3 p-4 bg-warm-50 rounded-xl">
                  <Truck className="h-5 w-5 text-warm-600" />
                  <div>
                    <p className="font-medium text-warm-800">
                      {deliveryLabels[selectedOrder.deliveryMethod] || selectedOrder.deliveryMethod}
                    </p>
                    {selectedOrder.address && (
                      <p className="text-sm text-warm-600">
                        {selectedOrder.address.street}, {selectedOrder.address.postalCode} {selectedOrder.address.city}
                      </p>
                    )}
                  </div>
                </div>

                {/* Paiement Mobile Money */}
                <PaymentPanel orderNumber={selectedOrder.orderNumber} token={session?.accessToken} />

                {/* Articles */}
                <div>
                  <h4 className="font-semibold text-warm-800 mb-3">Articles commandés</h4>
                  <div className="space-y-2 bg-warm-50 rounded-xl p-4">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm py-2 border-b border-warm-200 last:border-0">
                        <span className="text-warm-700">
                          {item.name} <span className="text-warm-500">x{item.quantity}</span>
                          {isReservation(item.availableFrom) && (
                            <span className="block text-xs text-amber-600 font-medium mt-0.5">
                              📅 Réservation — livraison à partir du{' '}
                              {new Date(item.availableFrom!).toLocaleDateString('fr-FR', {
                                day: 'numeric', month: 'long', year: 'numeric',
                              })}
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-warm-800">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totaux */}
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between text-warm-600">
                      <span>Sous-total</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-warm-600">
                      <span>Livraison</span>
                      <span>{selectedOrder.shippingCost > 0 ? formatPrice(selectedOrder.shippingCost) : 'Gratuit'}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-prairie-600 pt-2 border-t border-warm-200">
                      <span>Total</span>
                      <span>{formatPrice(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-warm-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-warm-700">
                    <Phone className="h-4 w-4" />
                    <span>Une question ? </span>
                    <a href="tel:+261380100101" className="font-medium text-prairie-600 hover:underline">
                      038 01 001 01
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
