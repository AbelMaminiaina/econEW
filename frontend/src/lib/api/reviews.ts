import { fetchAPI } from './config';
import type { ProductReviews } from '@/types';

export async function getProductReviews(slug: string): Promise<ProductReviews> {
  return fetchAPI<ProductReviews>(`/products/${encodeURIComponent(slug)}/reviews`);
}

export async function submitProductReview(
  slug: string,
  data: { rating: number; comment?: string },
  token: string
): Promise<void> {
  await fetchAPI(`/products/${encodeURIComponent(slug)}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
    token,
  });
}
