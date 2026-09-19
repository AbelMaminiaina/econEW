import type { Product } from '@/types';
import { getFeaturedProducts } from './FeaturedProducts';
import { CtaSection } from './CtaSection';

export async function CTAWithPreview() {
  let previewProduct: Product | undefined;
  try {
    const products: Product[] = await getFeaturedProducts();
    previewProduct = products.find((p) => p.images.length > 0);
  } catch {
    // L'aperçu est décoratif : sans API, on affiche la section sans produit.
  }

  return <CtaSection previewProduct={previewProduct} />;
}

export default CTAWithPreview;
