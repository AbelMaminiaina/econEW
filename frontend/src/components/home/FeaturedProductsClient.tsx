'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Product } from '@/types';
import ProductGrid from '@/components/products/ProductGrid';
import { Button } from '@/components/ui';
import { fadeInUp, staggerContainer, viewportOnce } from '@/lib/animations';
import { useCategories } from '@/hooks/useCategories';

interface FeaturedProductsClientProps {
  products: Product[];
}

// Emojis par slug de catégorie (repli générique si la catégorie n'est pas listée ici)
const categoryEmojis: Record<string, string> = {
  'porc': '🐖',
  'volaille': '🐓',
  'emballage': '📦',
  'fournitures-bureau': '🗂️',
  'hygiene-nettoyage': '🧴',
  'quincaillerie': '🔧',
  'electronique': '🔌',
  'textile': '🧵',
};

export function FeaturedProductsClient({ products }: FeaturedProductsClientProps) {
  const { categories } = useCategories();
  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <section className="section-y bg-white">
      <div className="container mx-auto px-4">
        <motion.div
          className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between"
          variants={fadeInUp}
          initial="initial"
          whileInView="animate"
          viewport={viewportOnce}
        >
          <div>
            <span className="mb-2 block font-medium text-prairie-600">À la une</span>
            <h2 className="heading-2 mb-2 font-bold text-warm-900">Nos produits à la une</h2>
            <p className="max-w-xl text-warm-600">
              Une sélection des produits les plus demandés, vendus en gros volume : à partir de
              90&nbsp;kg pour le porc, 500 pièces pour la volaille.
            </p>
          </div>
          <Link href="/produits" className="mt-4 md:mt-0">
            <Button variant="outline" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
              Voir tout le catalogue
            </Button>
          </Link>
        </motion.div>

        <ProductGrid products={products} />

        {activeCategories.length > 0 && (
          <motion.div
            className="mx-auto mt-16 grid max-w-7xl grid-cols-2 gap-4 md:grid-cols-4"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={viewportOnce}
          >
            {activeCategories.map((category) => (
              <motion.div key={category.id} variants={fadeInUp}>
                <Link
                  href={`/produits?categorie=${category.slug}`}
                  className="group flex items-center justify-center gap-3 rounded-2xl border border-warm-200 bg-warm-50 p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-prairie-50 hover:shadow-lg motion-reduce:hover:translate-y-0"
                >
                  <span className="text-2xl" aria-hidden="true">
                    {categoryEmojis[category.slug] || '📦'}
                  </span>
                  <span className="text-sm font-medium text-warm-700 group-hover:text-prairie-700">
                    {category.name}
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default FeaturedProductsClient;
