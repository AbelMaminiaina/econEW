'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { formatPrice, formatQuantity, getBadgeLabel, getCategoryLabel, getProductImage } from '@/lib/utils';
import { useProductActions } from './useProductActions';
import { StarRating } from './StarRating';

// Carte « liste » du template Electro (.products-mini-item) : image à gauche, infos à droite,
// barre « Ajouter au panier » qui se déploie au survol. Sert à la vue liste de la page Shop.
export function ProductMiniCard({ product }: { product: Product }) {
  const [imageError, setImageError] = useState(false);
  const {
    isApproved,
    canOrder,
    wished,
    unavailable,
    unitPrice,
    bestTierPrice,
    justAdded,
    addToCart,
    toggleWishlist,
    buttonLabel,
    buttonAriaLabel,
    upcoming,
  } = useProductActions(product);
  const href = `/produits/${product.slug}`;

  return (
    <div className="products-mini-item border">
      <div className="row g-0">
        <div className="col-5">
          <div className="products-mini-img border-end h-100">
            {!imageError ? (
              <Image
                src={getProductImage(product)}
                alt={product.name}
                width={400}
                height={400}
                sizes="(max-width: 992px) 40vw, 20vw"
                className="img-fluid w-100 h-100"
                style={{ objectFit: 'cover', background: '#f5f5f5' }}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="d-flex align-items-center justify-content-center w-100 h-100 bg-light text-muted small">
                Image indisponible
              </div>
            )}
            <div className="products-mini-icon rounded-circle bg-primary">
              <Link href={href} aria-label={`Voir ${product.name}`}>
                <i className="fa fa-eye fa-1x text-white"></i>
              </Link>
            </div>
          </div>
        </div>
        <div className="col-7">
          <div className="products-mini-content p-3">
            <Link href={`/produits?categorie=${product.category}`} className="d-block mb-2">
              {getCategoryLabel(product.category)}
            </Link>
            <Link href={href} className="d-block h4">
              {product.name}
            </Link>
            <div className="mb-1">
              <span className="text-primary fs-5">{formatPrice(unitPrice)}</span>
              {product.originalPrice && <del className="ms-2 fs-6">{formatPrice(product.originalPrice)}</del>}
              <small className="ms-1 text-muted">/{product.unit}</small>
            </div>
            {product.seller && (
              <small className="d-block text-muted">
                <i className="fas fa-store me-1"></i>Vendu par{' '}
                <Link href={`/vendeurs/${product.seller.id}`} className="text-primary">
                  {product.seller.name}
                </Link>
              </small>
            )}
            <small className="d-block text-muted">
              Quantité minimum&nbsp;: {formatQuantity(product.moq, product.unit)}
            </small>
            {bestTierPrice && bestTierPrice < product.price && (
              <small className="d-block text-muted">
                {isApproved ? `À partir de ${formatPrice(bestTierPrice)} en gros` : 'Tarifs dégressifs pour les pros'}
              </small>
            )}
            <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
              {product.freeShipping && (
                <small className="text-primary">
                  <i className="fas fa-truck me-1"></i>Livraison offerte
                </small>
              )}
              {upcoming && <small className="text-warning">Précommande</small>}
              {product.badges.map((badge) => (
                <span key={badge} className="badge rounded-pill bg-primary">{getBadgeLabel(badge)}</span>
              ))}
              {unavailable && <span className="badge rounded-pill bg-dark">Rupture de stock</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="products-mini-add border p-3">
        {canOrder ? (
          <button
            type="button"
            onClick={addToCart}
            disabled={unavailable}
            aria-label={buttonAriaLabel}
            className={`btn border-secondary rounded-pill py-2 px-4 ${justAdded ? 'btn-success' : 'btn-primary'}`}
          >
            <i className={`fas ${justAdded ? 'fa-check' : 'fa-shopping-cart'} me-2`}></i>
            {buttonLabel}
          </button>
        ) : (
          <span />
        )}
        <div className="d-flex align-items-center gap-3">
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

export default ProductMiniCard;
