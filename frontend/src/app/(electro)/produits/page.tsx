import { Suspense } from 'react';
import { Metadata } from 'next';
import { SERVER_API_BASE_URL } from '@/lib/api/config';
import ProductsClient from './ProductsClient';

// This page fetches from the backend, which isn't reachable from the isolated
// Docker build stage — force per-request rendering so the build doesn't try
// to prerender it statically.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Catalogue - Vente en gros pour professionnels',
  description:
    'Découvrez notre catalogue multi-catégories pour professionnels : smartphones, ordinateurs, photo, audio et accessoires. Tarifs dégressifs, livraison à Antananarivo.',
  keywords: [
    'catalogue grossiste madagascar',
    'vente en gros antananarivo',
    'fournitures professionnelles',
    'tarifs dégressifs',
    'achat en gros madagascar',
    'livraison professionnelle antananarivo',
  ],
  openGraph: {
    title: 'Catalogue | All',
    description:
      'Un catalogue multi-catégories pour professionnels, avec tarifs dégressifs par quantité et livraison à Antananarivo.',
    url: 'https://all.mg/produits',
    siteName: 'All',
    locale: 'fr_MG',
    type: 'website',
  },
  alternates: {
    canonical: '/produits',
  },
};

async function getProducts() {
  const apiUrl = `${SERVER_API_BASE_URL}/products`;
  console.log('[SSR] Fetching products from:', apiUrl);

  // Backend already caches this in Redis for 5 min (see CACHE_TTL.PRODUCTS).
  // We deliberately do NOT use Next.js' data cache: product payloads embed their
  // images (data: URIs) and the list can exceed Next's hard 2 MB fetch-cache
  // limit, which silently drops the oversized part of the response.
  const res = await fetch(apiUrl, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    console.error('[SSR] Fetch failed:', res.status, res.statusText);
    throw new Error('Failed to fetch products');
  }

  const data = await res.json();
  console.log('[SSR] Products fetched:', data.products?.length || 0);

  return data;
}

export default async function ProductsPage() {
  const data = await getProducts();

  return (
    <Suspense fallback={<div className="container py-5 text-center">Chargement…</div>}>
      <ProductsClient initialProducts={data.products} />
    </Suspense>
  );
}
