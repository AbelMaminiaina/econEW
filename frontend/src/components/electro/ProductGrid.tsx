import React from 'react';
import type { Product } from '@/types';
import ProductCard from './ProductCard';

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  /** Colonnes en très grand écran : 4 par défaut (template), 3 avec une barre latérale. */
  columns?: 3 | 4;
}

// Grille du template : `.product` est requis par style.css pour les effets de survol des cartes.
export function ProductGrid({ products, loading = false, columns = 4 }: ProductGridProps) {
  const colClass = columns === 3 ? 'col-md-6 col-xl-4' : 'col-md-6 col-lg-4 col-xl-3';

  if (loading) {
    return (
      <div className="row g-4 product" aria-busy="true">
        {[...Array(columns * 2)].map((_, i) => (
          <div key={i} className={colClass}>
            <div className="border rounded placeholder-glow">
              <div className="placeholder w-100 bg-light" style={{ aspectRatio: '1 / 1' }}></div>
              <div className="p-4">
                <span className="placeholder col-8 mb-2"></span>
                <span className="placeholder col-5"></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="py-5 text-center">
        <p className="fs-5 mb-0">Aucun produit ne correspond à votre recherche.</p>
      </div>
    );
  }

  return (
    <div className="row g-4 product">
      {products.map((product, index) => (
        <div key={product.id} className={colClass}>
          <ProductCard product={product} index={index} />
        </div>
      ))}
    </div>
  );
}

export default ProductGrid;
