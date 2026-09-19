'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { HEADER_CAROUSEL_OPTIONS, useOwlCarousel } from '../plugins';

// Images du template Electro (public/electro/img), en attendant les visuels de la plateforme.
const SLIDES = [
  {
    kicker: 'Vente en gros',
    title: 'Achetez en gros, au meilleur prix',
    description:
      'Vente en gros uniquement, dès 10 pièces par produit : des tarifs dégressifs par quantité, pour les professionnels comme pour les particuliers.',
    image: '/electro/img/carousel-1.png',
    cta: { label: 'Découvrir le catalogue', href: '/produits' },
  },
  {
    kicker: 'Paiement Mobile Money',
    title: 'Payez par MVola, Orange Money ou Airtel Money',
    description:
      'Commandez sans créer de compte : réglez en ligne par Mobile Money, votre commande est traitée dès que votre paiement est vérifié.',
    image: '/electro/img/carousel-2.png',
    cta: { label: 'Commander maintenant', href: '/produits' },
  },
  {
    kicker: 'Entreprises',
    title: 'Publiez vos produits, vendez en gros',
    description:
      'Les entreprises approuvées publient leurs produits sur la plateforme et reçoivent les commandes en gros des professionnels et des particuliers.',
    image: '/electro/img/product-9.png',
    cta: { label: 'Espace vendeur', href: '/vendeur' },
  },
];

// Carrousel d'accueil du template (Owl Carousel) + bannière d'offre à droite.
export function Hero() {
  const carouselRef = useRef<HTMLDivElement>(null);
  useOwlCarousel(carouselRef, HEADER_CAROUSEL_OPTIONS);

  return (
    <div className="container-fluid carousel bg-light px-0">
      <div className="row g-0 justify-content-end">
        <div className="col-12 col-lg-7 col-xl-9">
          <div ref={carouselRef} className="header-carousel owl-carousel bg-light py-5">
            {SLIDES.map((slide) => (
              <div key={slide.title} className="row g-0 header-carousel-item align-items-center">
                <div className="col-xl-6 carousel-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide.image} className="img-fluid w-100" alt="" />
                </div>
                <div className="col-xl-6 carousel-content p-4">
                  <h4 className="text-uppercase fw-bold mb-4" style={{ letterSpacing: 3 }}>{slide.kicker}</h4>
                  <h1 className="display-3 mb-4">{slide.title}</h1>
                  <p className="text-dark">{slide.description}</p>
                  <Link className="btn btn-primary rounded-pill py-3 px-5" href={slide.cta.href}>
                    {slide.cta.label}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="col-12 col-lg-5 col-xl-3 wow fadeInRight" data-wow-delay="0.1s">
          <div className="carousel-header-banner h-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/electro/img/header-img.jpg" className="img-fluid w-100 h-100" style={{ objectFit: 'cover' }} alt="" />
            <div className="carousel-banner-offer">
              <p className="bg-primary text-white rounded fs-5 py-2 px-4 mb-0 me-3">Tarifs dégressifs</p>
              <p className="text-primary fs-5 fw-bold mb-0">Offre pros</p>
            </div>
            <div className="carousel-banner">
              <div className="carousel-banner-content text-center p-4">
                <Link href="/produits" className="d-block mb-2">Comptes professionnels</Link>
                <Link href="/inscription" className="d-block text-white fs-3">
                  Paiement <br /> Mobile Money
                </Link>
              </div>
              <Link href="/inscription" className="btn btn-primary rounded-pill py-2 px-4">
                <i className="fas fa-shopping-cart me-2"></i> Ouvrir un compte pro
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Hero;
