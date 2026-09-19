import React from 'react';
import { Product } from '@/types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
}

// Grille unique pour l'accueil, le catalogue et les produits similaires.
const GRID_CLASSES = 'mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3';

export function ProductGrid({ products, loading = false }: ProductGridProps) {
  if (loading) {
    return (
      <div className={GRID_CLASSES}>
        {[...Array(6)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-warm-500">Aucun produit ne correspond à votre recherche.</p>
      </div>
    );
  }

  return (
    <div className={GRID_CLASSES}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-warm-200 bg-white">
      <div className="aspect-square bg-warm-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-warm-200" />
        <div className="h-6 w-1/3 rounded bg-warm-200" />
        <div className="h-10 rounded bg-warm-200" />
      </div>
    </div>
  );
}

export default ProductGrid;
