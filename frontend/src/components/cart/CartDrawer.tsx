'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui';
import { drawerSlide, modalBackdrop } from '@/lib/animations';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const cart = useCart();

  const total = cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            variants={modalBackdrop}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 flex flex-col shadow-xl"
            variants={drawerSlide}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-warm-100">
              <h2 className="text-lg font-semibold text-warm-800 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Mon Panier
                {cart.items.length > 0 && (
                  <span className="text-sm font-normal text-warm-500">
                    ({cart.items.reduce((sum, item) => sum + item.quantity, 0)} articles)
                  </span>
                )}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-warm-100 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5 text-warm-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag className="h-16 w-16 text-warm-300 mb-4" />
                  <p className="text-warm-600 mb-4">Votre panier est vide</p>
                  <Button onClick={onClose} variant="outline">
                    Continuer mes achats
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex gap-4 p-3 bg-warm-50 rounded-lg"
                    >
                      {/* Image */}
                      <div className="relative w-20 h-20 rounded-md overflow-hidden shrink-0 bg-white">
                        <Image
                          src={item.image || '/images/placeholder.jpg'}
                          alt={item.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/produits/${item.slug}`}
                          className="font-medium text-warm-800 hover:text-prairie-600 transition-colors line-clamp-2"
                          onClick={onClose}
                        >
                          {item.name}
                        </Link>
                        <p className="text-prairie-600 font-semibold mt-1">
                          {formatPrice(item.price)}
                        </p>

                        {/* Quantity controls */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                cart.updateQuantity(
                                  item.productId,
                                  item.quantity - 1
                                )
                              }
                              className="p-1 rounded-md hover:bg-warm-200 transition-colors"
                              aria-label="Diminuer la quantité"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                cart.updateQuantity(
                                  item.productId,
                                  item.quantity + 1
                                )
                              }
                              className="p-1 rounded-md hover:bg-warm-200 transition-colors"
                              aria-label="Augmenter la quantité"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <button
                            onClick={() => cart.removeItem(item.productId)}
                            className="p-1 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.items.length > 0 && (
              <div className="border-t border-warm-100 p-4 space-y-4">
                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-warm-600">Sous-total</span>
                  <span className="text-lg font-semibold text-warm-800">
                    {formatPrice(total)}
                  </span>
                </div>

                {/* Free shipping notice */}
                {total < 50 && (
                  <p className="text-sm text-warm-500 text-center">
                    Plus que {formatPrice(50 - total)} pour la livraison gratuite !
                  </p>
                )}
                {total >= 50 && (
                  <p className="text-sm text-prairie-600 text-center font-medium">
                    Livraison gratuite !
                  </p>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <Link href="/panier" onClick={onClose}>
                    <Button fullWidth icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
                      Voir mon panier
                    </Button>
                  </Link>
                  <Button variant="ghost" fullWidth onClick={onClose}>
                    Continuer mes achats
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CartDrawer;
