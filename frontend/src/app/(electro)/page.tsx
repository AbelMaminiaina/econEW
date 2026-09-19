import { Suspense } from 'react';
import { Hero } from '@/components/electro/home/Hero';
import { ServicesBar } from '@/components/electro/home/ServicesBar';
import { PromoBanners } from '@/components/electro/home/PromoBanners';
import { FeaturedProducts } from '@/components/electro/home/FeaturedProducts';
import { ProductBanners } from '@/components/electro/home/ProductBanners';
import { Values } from '@/components/electro/home/Values';
import { Testimonials } from '@/components/electro/home/Testimonials';
import { CtaSection } from '@/components/electro/home/CtaSection';
import { CTAWithPreview } from '@/components/electro/home/CTAWithPreview';
import { ProductGrid } from '@/components/electro/ProductGrid';

// FeaturedProducts appelle le backend, injoignable depuis l'étape de build Docker isolée :
// rendu à chaque requête pour éviter le prérendu statique.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ServicesBar />
      <PromoBanners />
      <Suspense
        fallback={
          <div className="container-fluid product py-5">
            <div className="container py-5">
              <ProductGrid products={[]} loading />
            </div>
          </div>
        }
      >
        <FeaturedProducts />
      </Suspense>
      <ProductBanners />
      <Values />
      <Testimonials />
      <Suspense fallback={<CtaSection />}>
        <CTAWithPreview />
      </Suspense>
    </>
  );
}
