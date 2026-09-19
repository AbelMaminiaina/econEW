import { fetchAPI } from './config';
import { Product } from '@/types';

interface ProductsResponse {
  products: Product[];
  total: number;
}

export async function getProducts(params?: {
  category?: string;
  search?: string;
  inStock?: boolean;
}): Promise<ProductsResponse> {
  const searchParams = new URLSearchParams();

  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.inStock) searchParams.set('inStock', 'true');

  const query = searchParams.toString();
  const endpoint = `/products${query ? `?${query}` : ''}`;

  return fetchAPI<ProductsResponse>(endpoint);
}

export async function getProductBySlug(slug: string): Promise<Product> {
  return fetchAPI<Product>(`/products/${slug}`);
}

export async function getRelatedProducts(slug: string, limit = 4): Promise<Product[]> {
  return fetchAPI<Product[]>(`/products/${slug}/related?limit=${limit}`);
}
