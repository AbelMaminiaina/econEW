'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProductForm } from '@/components/seller/ProductForm';
import { getSellerProducts } from '@/lib/api/seller';
import type { Product } from '@/types';

export default function EditSellerProductPage() {
  const params = useParams<{ id: string }>();
  const { data: session } = useSession();
  const token = session?.accessToken;
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    if (!token) return;
    getSellerProducts(token)
      .then((res) => setProduct(res.products.find((p) => p.id === params.id) ?? null))
      .catch(() => setProduct(null));
  }, [token, params.id]);

  if (product === undefined) return <div className="h-64 animate-pulse rounded-xl bg-white" />;

  if (product === null) {
    return (
      <div className="rounded-xl bg-white p-12 text-center text-warm-600">
        Produit introuvable.{' '}
        <Link href="/vendeur" className="text-prairie-600 underline">
          Retour à mes produits
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-2 text-2xl font-semibold text-warm-800">Modifier « {product.name} »</h2>
      <p className="mb-6 text-sm text-warm-600">
        Toute modification de contenu remet le produit en attente de validation par un administrateur.
      </p>
      <ProductForm product={product} />
    </div>
  );
}
