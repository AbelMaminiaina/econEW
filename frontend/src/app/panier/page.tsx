'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Truck, Shield, CreditCard } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import { formatDate, formatPrice, formatQuantity, formatWeight, getShippingCost, isUpcoming, resolveUnitPrice, FREE_SHIPPING_THRESHOLD } from '@/lib/utils';
import { Button } from '@/components/ui';
import { fadeInUp, staggerContainer } from '@/lib/animations';

export default function CartPage() {
  const cart = useCart();
  const { isApproved } = useCompanyAccess();

  // MOQ pour tous ; paliers dégressifs réservés aux comptes pro approuvés (les autres paient le
  // prix de base). Le prix facturé est recalculé côté backend à la commande.
  const minQtyOf = (item: (typeof cart.items)[number]) => item.moq;
  const unitPrice = (item: (typeof cart.items)[number]) =>
    isApproved ? resolveUnitPrice(item.price, item.priceTiers, item.quantity) : item.price;

  const subtotal = cart.items.reduce(
    (sum, item) => sum + unitPrice(item) * item.quantity,
    0
  );
  const hasFreeShippingItem = cart.items.some((item) => item.freeShipping);
  const shippingCost = getShippingCost('standard', subtotal, hasFreeShippingItem);
  const total = subtotal + shippingCost;

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-cream-50 py-12">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-lg mx-auto text-center py-20"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <div className="w-24 h-24 rounded-full bg-warm-100 flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-12 w-12 text-warm-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-warm-800 mb-4">
              Votre panier est vide
            </h1>
            <p className="text-warm-600 mb-8">
              Découvrez nos produits et commencez vos achats !
            </p>
            <Link href="/produits">
              <Button size="lg">Voir nos produits</Button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="mb-8"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-warm-800 mb-2">
            Mon Panier
          </h1>
          <p className="text-warm-600">
            {cart.items.reduce((sum, item) => sum + item.quantity, 0)} article(s) dans votre panier
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <motion.div
            className="lg:col-span-2 space-y-4"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {cart.items.map((item) => (
              <motion.div
                key={item.productId}
                variants={fadeInUp}
                className="bg-white rounded-xl p-4 md:p-6 shadow-sm"
              >
                <div className="flex gap-4">
                  {/* Image */}
                  <Link href={`/produits/${item.slug}`}>
                    <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-lg overflow-hidden shrink-0 bg-warm-50">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 768px) 96px, 128px"
                        className="object-cover"
                      />
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/produits/${item.slug}`}>
                      <h3 className="font-semibold text-warm-800 hover:text-prairie-600 transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="text-prairie-600 font-semibold mt-1">
                      {formatPrice(unitPrice(item))} / {item.unit}
                    </p>
                    <p className="text-xs text-warm-500">
                      Quantité minimum&nbsp;: {formatQuantity(item.moq, item.unit)}
                    </p>
                    {item.estimatedWeightKg ? (
                      <p className="text-xs text-warm-500 mt-0.5">
                        Poids estimé&nbsp;: {formatWeight(item.estimatedWeightKg)}
                      </p>
                    ) : null}
                    {item.freeShipping && (
                      <p className="text-xs text-prairie-600 font-medium mt-0.5">
                        Livraison offerte
                      </p>
                    )}
                    {isUpcoming(item.availableFrom) && (
                      <p className="text-xs text-amber-600 font-medium mt-0.5">
                        Réservation — disponible le {formatDate(item.availableFrom!)}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            cart.updateQuantity(
                              item.productId,
                              item.quantity - 1 < minQtyOf(item) ? 0 : item.quantity - 1
                            )
                          }
                          className="w-8 h-8 rounded-full border border-warm-300 flex items-center justify-center hover:bg-warm-100 transition-colors"
                          aria-label="Diminuer la quantité"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            cart.updateQuantity(item.productId, item.quantity + 1)
                          }
                          className="w-8 h-8 rounded-full border border-warm-300 flex items-center justify-center hover:bg-warm-100 transition-colors"
                          aria-label="Augmenter la quantité"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Line total and delete */}
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-warm-800">
                          {formatPrice(unitPrice(item) * item.quantity)}
                        </span>
                        <button
                          onClick={() => cart.removeItem(item.productId)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Continue shopping */}
            <Link href="/produits">
              <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
                Continuer mes achats
              </Button>
            </Link>
          </motion.div>

          {/* Order summary */}
          <motion.div
            className="lg:col-span-1"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="text-xl font-semibold text-warm-800 mb-6">
                Récapitulatif
              </h2>

              {/* Totals */}
              <div className="space-y-3 pb-6 border-b border-warm-100">
                <div className="flex justify-between text-warm-600">
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-warm-600">
                  <span>Livraison</span>
                  {shippingCost === 0 ? (
                    <span className="text-prairie-600 font-medium">Gratuite</span>
                  ) : (
                    <span>{formatPrice(shippingCost)}</span>
                  )}
                </div>
                {hasFreeShippingItem ? (
                  <p className="text-sm text-prairie-600">
                    Votre panier contient un produit à livraison offerte 🎉
                  </p>
                ) : (
                  subtotal < FREE_SHIPPING_THRESHOLD && (
                    <p className="text-sm text-warm-500">
                      Plus que {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} pour la livraison gratuite
                    </p>
                  )
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center py-4">
                <span className="text-lg font-semibold text-warm-800">Total</span>
                <span className="text-2xl font-bold text-prairie-600">
                  {formatPrice(total)}
                </span>
              </div>

              {/* Checkout button */}
              <Link href="/checkout">
                <Button
                  fullWidth
                  size="lg"
                  icon={<CreditCard className="h-5 w-5" />}
                  className="mb-4"
                >
                  Passer commande
                </Button>
              </Link>

              {/* Trust badges */}
              <div className="space-y-3 pt-4 border-t border-warm-100">
                <div className="flex items-center gap-2 text-sm text-warm-600">
                  <Shield className="h-4 w-4 text-prairie-600" />
                  <span>Paiement sécurisé</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-warm-600">
                  <Truck className="h-4 w-4 text-prairie-600" />
                  <span>Livraison sous 24-48h</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
