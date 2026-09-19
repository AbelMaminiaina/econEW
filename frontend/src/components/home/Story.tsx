'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { fadeInLeft, fadeInRight, viewportOnce } from '@/lib/animations';

export function Story() {
  return (
    <section id="histoire" className="py-20 bg-cream-50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Visual */}
          <motion.div
            className="relative"
            variants={fadeInLeft}
            initial="initial"
            whileInView="animate"
            viewport={viewportOnce}
          >
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-prairie-700 via-prairie-800 to-warm-900 flex items-center justify-center">
              <Building2 className="h-24 w-24 text-white/20" />
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-prairie-100 rounded-2xl -z-10" />
            <div className="absolute -top-6 -left-6 w-32 h-32 bg-terre-100 rounded-2xl -z-10" />

            {/* Experience badge */}
            <div className="absolute -bottom-4 left-8 bg-white rounded-xl shadow-lg p-4">
              <div className="text-3xl font-bold text-prairie-600">2024</div>
              <div className="text-sm text-warm-600">Création de All</div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            variants={fadeInRight}
            initial="initial"
            whileInView="animate"
            viewport={viewportOnce}
          >
            <span className="text-prairie-600 font-medium mb-2 block">
              Notre histoire
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-warm-800 mb-6">
              Simplifier l&apos;approvisionnement des professionnels
            </h2>

            <div className="space-y-4 text-warm-600 leading-relaxed">
              <p>
                All est née en 2024 à Madagascar, avec une ambition simple :
                donner aux entreprises un accès direct à un catalogue de gros
                multi-catégories, avec des tarifs qui reflètent réellement les
                volumes commandés.
              </p>
              <p>
                Nous avons construit la plateforme autour de ce que les
                acheteurs professionnels attendent vraiment : des paliers de
                prix transparents, des quantités minimum claires, et des
                conditions de paiement différé (30 ou 60 jours) une fois le
                compte de l&apos;entreprise validé.
              </p>
              <p>
                Pour nous, la vente en gros ne se résume pas à afficher un
                catalogue en ligne : c&apos;est fiabiliser chaque étape, de la
                validation du compte à la facturation, pour que nos clients
                professionnels puissent commander en confiance.
              </p>
              <p className="font-medium text-warm-800">
                Notre ambition : devenir la plateforme de référence pour
                l&apos;approvisionnement en gros des entreprises à Madagascar.
              </p>
            </div>

            {/* Devise */}
            <blockquote className="mt-8 border-l-4 border-prairie-500 pl-5">
              <p className="font-display text-xl text-warm-800">« Le gros, sans les complications »</p>
              <p className="text-sm text-warm-500 mt-1">
                Une philosophie qui guide notre travail chaque jour.
              </p>
            </blockquote>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Story;
