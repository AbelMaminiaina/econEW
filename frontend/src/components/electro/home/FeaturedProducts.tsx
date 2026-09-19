import { SERVER_API_BASE_URL } from '@/lib/api/config';
import type { Product } from '@/types';
import { FeaturedProductsClient } from './FeaturedProductsClient';

const TAB_SIZE = 8;

// Backend already caches this in Redis for 5 min (see CACHE_TTL.PRODUCTS).
// Not using Next.js' data cache here: product payloads embed their images
// (data: URIs) and the list can exceed Next's hard 2 MB fetch-cache limit,
// which silently drops the oversized part of the response.
async function fetchAllProducts(): Promise<Product[]> {
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
  return data.products;
}

// Les produits sans photo passent après les autres : la une doit rester présentable
const withPhotoFirst = <T extends { images: string[] }>(list: T[]): T[] =>
  [...list].sort((x, y) => Number(y.images.length > 0) - Number(x.images.length > 0));

const isHighlighted = (p: Product) => p.badges.includes('populaire') || p.badges.includes('nouveau');

// Produits populaires ou nouveaux d'abord, complétés par les suivants pour remplir 2 rangées de 4
function pickFeatured(products: Product[]): Product[] {
  const highlighted = withPhotoFirst(products.filter(isHighlighted));
  const others = withPhotoFirst(products.filter((p) => !isHighlighted(p)));
  return [...highlighted, ...others].slice(0, TAB_SIZE);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  return pickFeatured(await fetchAllProducts());
}

export interface FeaturedTabs {
  all: Product[];
  nouveautes: Product[];
  populaires: Product[];
}

// Onglets « Tous », « Nouveautés » (badge nouveau) et « À la une » (badge populaire)
export async function getFeaturedTabs(): Promise<FeaturedTabs> {
  const products = await fetchAllProducts();
  return {
    all: pickFeatured(products),
    nouveautes: withPhotoFirst(products.filter((p) => p.badges.includes('nouveau'))).slice(0, TAB_SIZE),
    populaires: withPhotoFirst(products.filter((p) => p.badges.includes('populaire'))).slice(0, TAB_SIZE),
  };
}

export async function FeaturedProducts() {
  const tabs = await getFeaturedTabs();

  return <FeaturedProductsClient tabs={tabs} />;
}

export default FeaturedProducts;
