import React from 'react';
import Link from 'next/link';

const OFFERS = [
  {
    href: '/produits',
    kicker: 'Un catalogue complet pour votre activité',
    title: 'Vente en gros',
    big: 'Prix',
    suffix: 'de gros',
    image: '/electro/img/product-1.png',
    animation: 'fadeInLeft',
    delay: '0.2s',
  },
  {
    href: '/inscription',
    kicker: 'Réservé aux entreprises approuvées',
    title: 'Compte pro',
    big: 'Prix',
    suffix: 'dégressifs',
    image: '/electro/img/product-2.png',
    animation: 'fadeInRight',
    delay: '0.3s',
  },
];

// « Products Offer » du template : deux cartes d'offre sous le carrousel.
export function PromoBanners() {
  return (
    <div className="container-fluid bg-light py-5">
      <div className="container">
        <div className="row g-4">
          {OFFERS.map((offer) => (
            <div key={offer.title} className={`col-lg-6 wow ${offer.animation}`} data-wow-delay={offer.delay}>
              <Link href={offer.href} className="d-flex align-items-center justify-content-between border bg-white rounded p-4">
                <div>
                  <p className="text-muted mb-3">{offer.kicker}</p>
                  <h3 className="text-primary">{offer.title}</h3>
                  <h1 className="display-3 text-secondary mb-0">
                    {offer.big} <span className="text-primary fw-normal">{offer.suffix}</span>
                  </h1>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={offer.image} className="img-fluid" style={{ maxWidth: 180 }} alt="" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PromoBanners;
