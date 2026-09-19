'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Product } from '@/types';
import ProductGrid from '@/components/products/ProductGrid';
import ProductFilter from '@/components/products/ProductFilter';
import { fadeInUp } from '@/lib/animations';

interface ProductsClientProps {
  initialProducts: Product[];
}

function ProductsContent({ initialProducts }: ProductsClientProps) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('categorie');
  const query = (searchParams.get('q') ?? '').trim();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryParam || 'all'
  );

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  const filteredProducts = useMemo(() => {
    const needle = query.toLowerCase();
    return initialProducts.filter((p) => {
      // Gérer les deux formats de catégorie (avec tirets et underscores)
      const inCategory =
        selectedCategory === 'all' ||
        p.category === selectedCategory ||
        p.category.replace(/-/g, '_') === selectedCategory.replace(/-/g, '_');
      const matchesQuery =
        !needle ||
        `${p.name} ${p.shortDescription} ${p.description}`.toLowerCase().includes(needle);
      return inCategory && matchesQuery;
    });
  }, [selectedCategory, initialProducts, query]);

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialProducts.forEach((p) => {
      // Normaliser le slug de catégorie (tirets)
      const slug = p.category.replace(/_/g, '-');
      counts[slug] = (counts[slug] || 0) + 1;
    });
    return counts;
  }, [initialProducts]);

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Hero Section */}
      <section className="relative h-[40vh] min-h-[300px] flex items-center bg-gradient-to-br from-warm-900 via-prairie-900 to-warm-800">
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-2xl text-white"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <span className="text-prairie-300 font-medium mb-2 block">
              Notre catalogue
            </span>
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Tous nos produits
            </h1>
            <p className="text-lg text-warm-200">
              Un catalogue multi-catégories ouvert à tous : particuliers et
              professionnels (tarifs dégressifs pour les comptes entreprise approuvés).
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* Filters */}
        <motion.div
          className="flex justify-center mb-8"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <ProductFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            productCounts={productCounts}
          />
        </motion.div>

        {/* Results count */}
        {/* <motion.p
          className="text-warm-500 text-center mb-8"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
        </motion.p> */}

        {query && (
          <p className="mb-6 text-center text-warm-600" role="status">
            {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''} pour «&nbsp;{query}&nbsp;»
          </p>
        )}

        {/* Products grid */}
        <ProductGrid products={filteredProducts} />
      </div>
    </div>
  );
}

export default function ProductsClient({ initialProducts }: ProductsClientProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream-50 py-12 flex items-center justify-center">Chargement...</div>}>
      <ProductsContent initialProducts={initialProducts} />
    </Suspense>
  );
}
