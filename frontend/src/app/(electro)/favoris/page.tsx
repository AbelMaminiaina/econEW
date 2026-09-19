'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/types';
import { getProducts } from '@/lib/api/products';
import { useWishlist } from '@/hooks/useWishlist';
import { PageHeader } from '@/components/electro/PageHeader';
import ProductGrid from '@/components/electro/ProductGrid';

// Favoris : produits marqués d'un cœur, conservés dans le navigateur.
export default function FavoritesPage() {
  const wishlist = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((res) => {
        if (!cancelled) setProducts(res.products);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const favorites = (products ?? []).filter((p) => wishlist.ids.includes(p.id));
  const loading = !wishlist.isHydrated || (products === null && !failed);

  return (
    <>
      <PageHeader
        title="Mes favoris"
        crumbs={[{ label: 'Favoris' }]}
        description={
          wishlist.isHydrated && wishlist.count > 0
            ? `${wishlist.count} produit${wishlist.count > 1 ? 's' : ''} enregistré${wishlist.count > 1 ? 's' : ''} sur cet appareil`
            : undefined
        }
      />

      <div className="container-fluid product py-5">
        <div className="container py-5">
          {loading ? (
            <ProductGrid products={[]} loading />
          ) : failed ? (
            <p className="text-center">Impossible de charger vos favoris pour le moment.</p>
          ) : favorites.length === 0 ? (
            <div className="text-center mx-auto" style={{ maxWidth: 560 }}>
              <i className="far fa-heart display-1 text-secondary mb-4 d-block"></i>
              <h2 className="mb-3">Aucun favori pour l&apos;instant</h2>
              <p className="mb-4">Cliquez sur le cœur d&apos;un produit pour le retrouver ici.</p>
              <Link href="/produits" className="btn btn-primary rounded-pill py-3 px-5">
                Voir nos produits
              </Link>
            </div>
          ) : (
            <>
              <div className="d-flex justify-content-end mb-4">
                <button type="button" className="btn btn-light rounded-pill py-2 px-4" onClick={wishlist.clear}>
                  <i className="fas fa-trash-alt me-2"></i>Tout retirer
                </button>
              </div>
              <ProductGrid products={favorites} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
