'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import {
  formatDate,
  formatPrice,
  formatQuantity,
  getBadgeLabel,
  getCategoryLabel,
  getProductImage,
} from '@/lib/utils';
import { useProductActions } from './useProductActions';
import { StarRating } from './StarRating';

interface ProductCardProps {
  product: Product;
  /** Position dans la grille : sert à décaler l'animation WOW des cartes d'une même rangée. */
  index?: number;
}

const BADGE_CLASSES: Record<string, string> = {
  bio: 'bg-success',
  plein_air: 'bg-info text-dark',
  populaire: 'bg-warning text-dark',
  nouveau: 'bg-primary',
  promo: 'bg-secondary',
  default: 'bg-dark',
};

// Carte produit du template Electro (.product-item de style.css) : image + pastille ronde,
// catégorie / nom / prix centrés, panneau « Ajouter au panier » + étoiles + cœur au survol.
// Les règles B2B (quantité minimum, paliers, accès) s'y ajoutent.
export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const {
    isApproved,
    canOrder,
    wished,
    upcoming,
    unavailable,
    unitPrice,
    bestTierPrice,
    justAdded,
    addToCart,
    toggleWishlist,
    buttonLabel,
    buttonAriaLabel,
  } = useProductActions(product);
  const href = `/produits/${product.slug}`;

  // Pastille ronde du template (Nouveau / Promo) ; les autres badges restent des pilules à gauche.
  const roundBadge = product.badges.find((b) => b === 'nouveau' || b === 'promo');
  const otherBadges = product.badges.filter((b) => b !== roundBadge);

  return (
    <div className="product-item rounded wow fadeInUp" data-wow-delay={`${0.1 + (index % 4) * 0.1}s`}>
      <div className="product-item-inner border rounded">
        <div className="product-item-inner-item">
          {!imageError ? (
            <Image
              src={getProductImage(product)}
              alt={product.name}
              width={400}
              height={400}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
              className="img-fluid w-100 rounded-top"
              style={{ aspectRatio: '1 / 1', objectFit: 'cover', background: '#f5f5f5' }}
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="d-flex align-items-center justify-content-center w-100 bg-light text-muted"
              style={{ aspectRatio: '1 / 1' }}
            >
              Image indisponible
            </div>
          )}

          {roundBadge === 'promo' ? (
            <div className="product-sale">{getBadgeLabel(roundBadge)}</div>
          ) : roundBadge === 'nouveau' ? (
            <div className="product-new">{getBadgeLabel(roundBadge)}</div>
          ) : null}

          {otherBadges.length > 0 && (
            <div className="position-absolute top-0 start-0 m-3 d-flex flex-wrap gap-1">
              {otherBadges.map((badge) => (
                <span key={badge} className={`badge rounded-pill ${BADGE_CLASSES[badge] ?? BADGE_CLASSES.default}`}>
                  {getBadgeLabel(badge)}
                </span>
              ))}
            </div>
          )}

          {unavailable && (
            <div
              className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{ background: 'rgba(0, 0, 0, .55)', zIndex: 1 }}
            >
              <span className="badge bg-dark fs-6 py-2 px-3">Rupture de stock</span>
            </div>
          )}

          <div className="product-details">
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
          <div>
            <span className="text-primary fs-5">{formatPrice(unitPrice)}</span>
            {product.originalPrice && <del className="ms-2 fs-6">{formatPrice(product.originalPrice)}</del>}
          </div>
          <small className="d-block text-muted">
            /{product.unit}
            {bestTierPrice && bestTierPrice < product.price && (
              isApproved
                ? <> · à partir de {formatPrice(bestTierPrice)} en gros</>
                : <> · tarifs dégressifs pour les pros</>
            )}
          </small>
          {product.seller && (
            <small className="d-block text-muted mt-1">
              <i className="fas fa-store me-1"></i>Vendu par{' '}
              <Link href={`/vendeurs/${product.seller.id}`} className="text-primary">
                {product.seller.name}
              </Link>
            </small>
          )}
          <small className="d-block text-muted mt-1">
            Quantité minimum&nbsp;: {formatQuantity(product.moq, product.unit)}
          </small>
          {product.freeShipping && (
            <small className="d-block text-primary">
              <i className="fas fa-truck me-1"></i>Livraison offerte
            </small>
          )}
          {upcoming && (
            <small className="d-block text-warning">
              <i className="far fa-calendar-alt me-1"></i>Disponible le {formatDate(product.availableFrom!)}
            </small>
          )}
        </div>
      </div>

      <div className="product-item-add border border-top-0 rounded-bottom text-center p-4 pt-0">
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
            <StarRating value={product.rating} count={product.reviewCount} showCount={false} animated />
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

export default ProductCard;
