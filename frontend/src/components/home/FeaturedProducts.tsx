import { SERVER_API_BASE_URL } from '@/lib/api/config';
import type { Product } from '@/types';
import { FeaturedProductsClient } from './FeaturedProductsClient';

// Backend already caches this in Redis for 5 min (see CACHE_TTL.PRODUCTS).
// Not using Next.js' data cache here: product payloads embed their images
// (data: URIs) and the list can exceed Next's hard 2 MB fetch-cache limit,
// which silently drops the oversized part of the response.
export async function getFeaturedProducts(): Promise<Product[]> {
  const apiUrl = `${SERVER_API_BASE_URL}/products`;
  console.log('[SSR] Fetching featured products from:', apiUrl);

  const res = await fetch(apiUrl, {
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    console.error('[SSR] Featured fetch failed:', res.status, res.statusText);
    throw new Error('Failed to fetch featured products');
  }

  const data: { products: Product[] } = await res.json();
  console.log('[SSR] Featured products fetched, total:', data.products?.length || 0);

  // Produits populaires ou nouveaux d'abord, complétés par les suivants pour remplir 2 rangées de 3
  const isHighlighted = (p: Product) =>
    p.badges.includes('populaire') || p.badges.includes('nouveau');
  // Les produits sans photo passent après les autres : la une doit rester présentable
  const withPhotoFirst = <T extends { images: string[] }>(list: T[]): T[] =>
    [...list].sort((x, y) => Number(y.images.length > 0) - Number(x.images.length > 0));
  const highlighted = withPhotoFirst(data.products.filter(isHighlighted));
  const others = withPhotoFirst(data.products.filter((p) => !isHighlighted(p)));

  return [...highlighted, ...others].slice(0, 6);
}

export async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  return <FeaturedProductsClient products={products} />;
}

export default FeaturedProducts;
