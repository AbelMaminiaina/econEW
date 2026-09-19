'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Package, Percent, Truck, Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { fadeInUp, staggerContainer, viewportOnce } from '@/lib/animations';

const values = [
  {
    icon: Package,
    title: 'Vente en gros pour tous',
    description:
      'Particuliers et professionnels achètent en gros volume : à partir de 90 kg pour le porc, 500 pièces pour la volaille. La quantité minimum est indiquée sur chaque produit.',
    color: 'text-prairie-600',
    bgColor: 'bg-prairie-50',
  },
  {
    icon: Percent,
    title: 'Tarifs dégressifs',
    description:
      'Pour les comptes professionnels approuvés, plus vous commandez, moins vous payez à l\'unité. Les paliers de prix sont affichés de manière transparente.',
    color: 'text-terre-600',
    bgColor: 'bg-terre-50',
  },
  {
    icon: Receipt,
    title: 'Facturation à 30/60 jours',
    description:
      'Une fois votre entreprise validée par notre équipe, commandez maintenant et réglez selon les conditions de paiement différé accordées. Les particuliers paient à la livraison.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    icon: Truck,
    title: 'Livraison fiable',
    description:
      'Livraison à Antananarivo et environs, ou retrait sur place. Suivi de commande dans votre espace client.',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
];

export function Values() {
  return (
    <section className="section-y bg-cream-100">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={viewportOnce}
        >
          <span className="text-prairie-600 font-medium mb-2 block">
            Pourquoi All
          </span>
          <h2 className="heading-2 font-bold text-warm-900 mb-4">
            Ce qui fait la différence
          </h2>
          <p className="text-warm-600">
            Une plateforme pensée pour l&apos;achat en gros : quantités claires, prix
            transparents, paiement adapté et livraison fiable.
          </p>
        </motion.div>

        {/* Values grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={viewportOnce}
        >
          {values.map((value) => (
            <motion.div key={value.title} variants={fadeInUp}>
              <Card hover className="h-full text-center">
                <CardContent>
                  <div
                    className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${value.bgColor} mb-4`}
                  >
                    <value.icon className={`h-8 w-8 ${value.color}`} />
                  </div>
                  <h3 className="text-xl font-semibold text-warm-800 mb-3">
                    {value.title}
                  </h3>
                  <p className="text-warm-600 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default Values;
