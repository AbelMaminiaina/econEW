'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Phone, MapPin, Mail, Package } from 'lucide-react';
import { Button } from '@/components/ui';
import { fadeInLeft, fadeInRight, viewportOnce } from '@/lib/animations';
import { formatPrice, formatQuantity } from '@/lib/utils';
import type { Product } from '@/types';

interface CTASectionProps {
  previewProduct?: Product;
}

export function CTASection({ previewProduct }: CTASectionProps) {
  return (
    <section className="section-y bg-warm-800 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            variants={fadeInLeft}
            initial="initial"
            whileInView="animate"
            viewport={viewportOnce}
          >
            <h2 className="heading-2 font-display font-bold text-white mb-6">
              Prêt à commander en gros ?
            </h2>
            <p className="lead text-warm-300 mb-8">
              Créez votre compte professionnel, faites-le valider par notre
              équipe, et accédez à nos tarifs dégressifs et à la facturation
              à 30/60 jours. Particulier ? Vous pouvez aussi commander en gros volume.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-warm-200">
                <div className="w-10 h-10 rounded-full bg-prairie-600 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <span>LE 187, Ambohitsoa Ambavatonelina, Madagascar</span>
              </div>
              <div className="flex items-center gap-3 text-warm-200">
                <div className="w-10 h-10 rounded-full bg-prairie-600 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <a href="mailto:contact@all.mg" className="hover:text-white transition-colors">
                  contact@all.mg
                </a>
              </div>
              <div className="flex items-center gap-3 text-warm-200">
                <div className="w-10 h-10 rounded-full bg-prairie-600 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <a href="tel:+261380100101" className="hover:text-white transition-colors">
                  038 01 001 01
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/inscription">
                <Button
                  size="lg"
                  icon={<ArrowRight className="h-5 w-5" />}
                  iconPosition="right"
                >
                  Créer un compte professionnel
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-warm-800"
                >
                  Nous contacter
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-warm-400">
              Sans engagement · Inscription gratuite · Validation sous 1 à 2 jours ouvrés
            </p>
          </motion.div>

          {/* Right visual */}
          <motion.div
            className="relative"
            variants={fadeInRight}
            initial="initial"
            whileInView="animate"
            viewport={viewportOnce}
          >
            {previewProduct ? (
              <Link
                href={`/produits/${previewProduct.slug}`}
                className="group block relative aspect-square rounded-2xl overflow-hidden bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prairie-400 focus-visible:ring-offset-2 focus-visible:ring-offset-warm-800"
                aria-label={`Voir ${previewProduct.name}`}
              >
                <Image
                  src={previewProduct.images[0] || '/images/placeholder.jpg'}
                  alt={previewProduct.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain p-6 transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-warm-900/90 to-transparent p-6 pt-16 text-white">
                  <p className="font-semibold">{previewProduct.name}</p>
                  <p className="text-sm text-warm-200">
                    {formatPrice(previewProduct.price)} / {previewProduct.unit} · minimum{' '}
                    {formatQuantity(previewProduct.moq, previewProduct.unit)}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-prairie-700 via-prairie-800 to-warm-900 flex items-center justify-center">
                <Package className="h-28 w-28 text-white/20" />
              </div>
            )}
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl p-6 max-w-[250px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-prairie-200 ring-2 ring-white" />
                  <div className="w-8 h-8 rounded-full bg-terre-200 ring-2 ring-white" />
                  <div className="w-8 h-8 rounded-full bg-warm-200 ring-2 ring-white" />
                </div>
                <span className="text-sm font-medium text-warm-800">Entreprises clientes</span>
              </div>
              <p className="text-sm text-warm-600">
                Font confiance à All pour leur approvisionnement en gros.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default CTASection;
