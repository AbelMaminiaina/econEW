import { Suspense } from 'react';
import { Hero } from '@/components/home/Hero';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { Values } from '@/components/home/Values';
import { Testimonials } from '@/components/home/Testimonials';
import { ClientLogos } from '@/components/home/ClientLogos';
import { CTASection } from '@/components/home/CTASection';
import { CTAWithPreview } from '@/components/home/CTAWithPreview';
import { ProductGrid } from '@/components/products/ProductGrid';

// FeaturedProducts appelle le backend, injoignable depuis l'étape de build Docker isolée :
// rendu à chaque requête pour éviter le prérendu statique.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Suspense
        fallback={
          <section className="section-y bg-white">
            <div className="container mx-auto px-4">
              <ProductGrid products={[]} loading />
            </div>
          </section>
        }
      >
        <FeaturedProducts />
      </Suspense>
      <Values />
      <Testimonials />
      <ClientLogos />
      <Suspense fallback={<CTASection />}>
        <CTAWithPreview />
      </Suspense>
    </>
  );
}
