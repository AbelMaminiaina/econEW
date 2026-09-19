'use client';

import React, { useRef } from 'react';
import { testimonials } from '@/data/testimonials';
import { TESTIMONIAL_CAROUSEL_OPTIONS, useOwlCarousel } from '../plugins';
import { StarRating } from '../StarRating';

// Témoignages en carrousel Owl (mêmes options que les autres carrousels du template).
export function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  useOwlCarousel(ref, TESTIMONIAL_CAROUSEL_OPTIONS, testimonials.length > 0);

  if (testimonials.length === 0) return null;

  return (
    <div className="container-fluid py-5">
      <div className="container py-5">
        <div className="text-center mx-auto mb-5 wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: 720 }}>
          <p className="text-primary fw-bold mb-2">Avis clients</p>
          <h1 className="display-6">Ce que disent nos clients</h1>
          <p className="mb-0">Particuliers et professionnels partagent leur expérience sur All.</p>
        </div>
        <div ref={ref} className="owl-carousel owl-theme testimonial-carousel">
          {testimonials.map((t) => (
            <div key={t.id} className="border rounded p-4 h-100 bg-light">
              <StarRating value={t.rating} count={1} showCount={false} className="mb-3" />
              <p className="mb-4">&ldquo;{t.content}&rdquo;</p>
              <h5 className="text-dark mb-1">{t.name}</h5>
              <small className="d-block">{t.location}</small>
              {t.productPurchased && (
                <small className="d-block text-primary mt-1">A acheté : {t.productPurchased}</small>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Testimonials;
