import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, formatQuantity, getProductImage } from '@/lib/utils';
import type { Product } from '@/types';

// Bandeau d'appel à l'action (fond sombre du footer du template) avec aperçu d'un produit.
export function CtaSection({ previewProduct }: { previewProduct?: Product }) {
  return (
    <div className="container-fluid footer py-5">
      <div className="container py-5">
        <div className="row g-5 align-items-center">
          <div className="col-lg-7 wow fadeInLeft" data-wow-delay="0.1s">
            <h1 className="display-6 text-white mb-4">Prêt à commander en gros ?</h1>
            <p className="mb-4 fs-5">
              Créez votre compte professionnel, faites-le valider par notre équipe, et accédez à nos tarifs
              dégressifs. Particulier ? Vous pouvez aussi commander en gros volume, sans compte, et payer par Mobile Money.
            </p>
            <p className="mb-1">
              <i className="fas fa-map-marker-alt text-primary me-3"></i>LE 187, Ambohitsoa Ambavatonelina, Madagascar
            </p>
            <p className="mb-1">
              <i className="fas fa-envelope text-primary me-3"></i>
              <a href="mailto:contact@all.mg" className="text-decoration-none" style={{ color: 'inherit' }}>contact@all.mg</a>
            </p>
            <p className="mb-4">
              <i className="fas fa-phone-alt text-primary me-3"></i>
              <a href="tel:+261380100101" className="text-decoration-none" style={{ color: 'inherit' }}>038 01 001 01</a>
            </p>
            <div className="d-flex flex-wrap gap-3">
              <Link href="/inscription" className="btn btn-primary rounded-pill py-3 px-5">
                Créer un compte professionnel
              </Link>
              <Link href="/contact" className="btn btn-secondary rounded-pill py-3 px-5">
                Nous contacter
              </Link>
            </div>
            <small className="d-block mt-3">
              Sans engagement · Inscription gratuite · Validation sous 1 à 2 jours ouvrés
            </small>
          </div>
          <div className="col-lg-5 wow fadeInRight" data-wow-delay="0.1s">
            {previewProduct && (
              <Link
                href={`/produits/${previewProduct.slug}`}
                className="d-block position-relative rounded overflow-hidden bg-white"
                aria-label={`Voir ${previewProduct.name}`}
              >
                <Image
                  src={getProductImage(previewProduct)}
                  alt={previewProduct.name}
                  width={600}
                  height={600}
                  sizes="(max-width: 992px) 100vw, 40vw"
                  className="img-fluid w-100"
                  style={{ aspectRatio: '1 / 1', objectFit: 'contain' }}
                />
                <div className="position-absolute bottom-0 start-0 w-100 p-4 text-white" style={{ background: 'rgba(0, 0, 0, .65)' }}>
                  <p className="fw-bold mb-1">{previewProduct.name}</p>
                  <small>
                    {formatPrice(previewProduct.price)} / {previewProduct.unit} · minimum{' '}
                    {formatQuantity(previewProduct.moq, previewProduct.unit)}
                  </small>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CtaSection;
