'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Package, ShoppingBag, Copy, Receipt } from 'lucide-react';
import { Button } from '@/components/ui';
import { fadeInUp } from '@/lib/animations';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order') || 'N/A';
  const invoiceNumber = searchParams.get('invoice');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-cream-50 py-12">
      <div className="container mx-auto px-4">
        <motion.div
          className="max-w-2xl mx-auto"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          {/* Success header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-prairie-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-prairie-600" />
            </div>
            <h1 className="text-3xl font-display font-bold text-warm-800 mb-2">
              Commande confirmée !
            </h1>
            <p className="text-warm-600">
              {invoiceNumber
                ? 'Merci pour votre commande. Une facture a été générée et vous a été envoyée par e-mail.'
                : 'Merci pour votre commande. Un e-mail de confirmation vous a été envoyé ; vous réglerez à la livraison ou au retrait.'}
            </p>
          </div>

          {/* Order number */}
          <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warm-600">Numéro de commande</p>
                <p className="text-2xl font-bold text-warm-800">{orderNumber}</p>
              </div>
              <button
                onClick={() => copyToClipboard(orderNumber)}
                className="p-2 hover:bg-warm-100 rounded-lg transition-colors"
                title="Copier"
              >
                <Copy className="h-5 w-5 text-warm-600" />
              </button>
            </div>
          </div>

          {/* Invoice */}
          {invoiceNumber && (
            <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-prairie-600 rounded-lg flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-warm-800">
                    Facture {invoiceNumber}
                  </h2>
                  <p className="text-warm-600 text-sm">
                    Consultez son échéance et son statut dans votre espace &quot;Mes commandes&quot;.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/suivi-commande">
              <Button variant="outline" icon={<Package className="h-4 w-4" />}>
                Suivre ma commande
              </Button>
            </Link>
            <Link href="/produits">
              <Button icon={<ShoppingBag className="h-4 w-4" />}>
                Continuer mes achats
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50 flex items-center justify-center">Chargement...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
