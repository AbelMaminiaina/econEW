'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { formatPrice, getBadgeLabel, getCategoryLabel, getProductImage } from '@/lib/utils';
import { useProductActions } from './useProductActions';
import { StarRating } from './StarRating';
import { RELATED_CAROUSEL_OPTIONS, useOwlCarousel } from './plugins';

// Carte du carrousel « Related Product » du template (.related-item de style.css).
function RelatedItem({ product }: { product: Product }) {
  const {
    canOrder,
    wished,
    unavailable,
    unitPrice,
    justAdded,
    addToCart,
    toggleWishlist,
    buttonLabel,
    buttonAriaLabel,
  } = useProductActions(product);
  const href = `/produits/${product.slug}`;
  const roundBadge = product.badges.find((b) => b === 'nouveau' || b === 'promo');

  return (
    <div className="related-item rounded">
      <div className="related-item-inner border rounded">
        <div className="related-item-inner-item">
          <Image
            src={getProductImage(product)}
            alt={product.name}
            width={400}
            height={400}
            sizes="(max-width: 768px) 100vw, 25vw"
            className="img-fluid w-100 rounded-top"
            style={{ aspectRatio: '1 / 1', objectFit: 'cover', background: '#f5f5f5' }}
          />
          {roundBadge === 'promo' ? (
            <div className="related-sale">{getBadgeLabel(roundBadge)}</div>
          ) : roundBadge === 'nouveau' ? (
            <div className="related-new">{getBadgeLabel(roundBadge)}</div>
          ) : null}
          <div className="related-details">
            <Link href={href} aria-label={`Voir ${product.name}`}>
              <i className="fa fa-eye fa-1x"></i>
            </Link>
          </div>
        </div>
        <div className="text-center rounded-bottom p-4">
          <Link href={`/produits?categorie=${product.category}`} className="d-block mb-2">
            {getCategoryLabel(product.category)}
          </Link>
          <Link href={href} className="d-block h4">
            {product.name}
          </Link>
          {product.originalPrice && <del className="me-2 fs-5">{formatPrice(product.originalPrice)}</del>}
          <span className="text-primary fs-5">{formatPrice(unitPrice)}</span>
        </div>
      </div>
      <div className="related-item-add border border-top-0 rounded-bottom text-center p-4 pt-0">
        {canOrder && (
          <button
            type="button"
            onClick={addToCart}
            disabled={unavailable}
            aria-label={buttonAriaLabel}
            className={`btn border-secondary rounded-pill py-2 px-4 mb-4 ${justAdded ? 'btn-success' : 'btn-primary'}`}
          >
            <i className={`fas ${justAdded ? 'fa-check' : 'fa-shopping-cart'} me-2`}></i>
            {buttonLabel}
          </button>
        )}
        <div className="d-flex justify-content-between align-items-center">
          <Link href={`${href}#avis`} aria-label="Voir les avis" className="text-decoration-none">
            <StarRating value={product.rating} count={product.reviewCount} showCount={false} />
          </Link>
          <button
            type="button"
            onClick={toggleWishlist}
            aria-pressed={wished}
            aria-label={wished ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`btn-wish${wished ? ' active' : ''}`}
          >
            <i className="fas fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

// Section « Related Product » : titre centré + carrousel Owl (sans boucle : les cartes ne sont pas
// clonées, leurs boutons restent donc actifs).
export function RelatedProducts({ products }: { products: Product[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useOwlCarousel(ref, RELATED_CAROUSEL_OPTIONS, products.length > 0);

  if (products.length === 0) return null;

  return (
    <div className="container-fluid related-product">
      <div className="container">
        <div className="mx-auto text-center pb-5" style={{ maxWidth: 700 }}>
          <h4
            className="text-primary mb-4 border-bottom border-primary border-2 d-inline-block p-2 title-border-radius wow fadeInUp"
            data-wow-delay="0.1s"
          >
            Produits similaires
          </h4>
          <p className="wow fadeInUp" data-wow-delay="0.2s">
            D&apos;autres produits de la même catégorie, vendus eux aussi en gros.
          </p>
        </div>
        <div ref={ref} className="related-carousel owl-carousel pt-4">
          {products.map((product) => (
            <RelatedItem key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default RelatedProducts;
