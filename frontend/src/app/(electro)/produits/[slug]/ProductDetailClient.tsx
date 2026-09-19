'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Product } from '@/types';
import { PageHeader } from '@/components/electro/PageHeader';
import { StarRating } from '@/components/electro/StarRating';
import { RelatedProducts } from '@/components/electro/RelatedProducts';
import { ReviewForm, ReviewsList, useProductReviews } from '@/components/electro/ProductReviews';
import { SINGLE_CAROUSEL_OPTIONS, useOwlCarousel } from '@/components/electro/plugins';
import {
  formatDate,
  formatPrice,
  formatQuantity,
  formatWeight,
  getBadgeLabel,
  getCategoryLabel,
  getProductImage,
  isUpcoming,
  resolveUnitPrice,
} from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useCategories } from '@/hooks/useCategories';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import { useWishlist } from '@/hooks/useWishlist';
import { useToast } from '@/components/electro/Toast';

// Version allégée du catalogue, pour la barre latérale (catégories avec compteurs, produits en vedette)
export type CatalogItem = Pick<
  Product,
  'id' | 'name' | 'slug' | 'category' | 'price' | 'originalPrice' | 'images' | 'rating' | 'reviewCount'
>;

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
  catalog?: CatalogItem[];
}

const normalize = (slug: string) => slug.replace(/_/g, '-');

// Page produit : « Single Page » du template Electro (single.html) : barre latérale à gauche,
// galerie Owl + infos à droite, onglets Description / Avis, formulaire d'avis, produits similaires.
export default function ProductDetailClient({ product, relatedProducts, catalog = [] }: ProductDetailClientProps) {
  const { isApproved, canOrder } = useCompanyAccess();
  const { categories } = useCategories();
  // MOQ pour tous (vente en gros). Paliers dégressifs : pros approuvés uniquement.
  const minQty = product.moq;
  const [customQty, setQuantity] = useState<number | null>(null);
  const quantity = Math.max(minQty, customQty ?? minQty);
  const [tab, setTab] = useState<'description' | 'avis'>('description');
  const [shareUrl, setShareUrl] = useState('');
  const cart = useCart();
  const wishlist = useWishlist();
  const { addToast } = useToast();
  const { data: reviews, loadFailed, reload } = useProductReviews(product.slug);

  useEffect(() => {
    setShareUrl(window.location.href.split('#')[0]);
  }, []);

  const upcoming = isUpcoming(product.availableFrom);
  const wished = wishlist.has(product.id);
  const unitPrice = isApproved
    ? resolveUnitPrice(product.price, product.priceTiers, quantity)
    : product.price;
  // Note : celle des avis chargés, sinon celle envoyée par le serveur
  const rating = reviews ? reviews.average : product.rating ?? null;
  const reviewCount = reviews ? reviews.count : product.reviewCount ?? 0;

  // Galerie : les photos du produit, sinon un visuel par défaut
  const gallery = product.images.length > 0 ? product.images : [getProductImage(product)];
  const galleryRef = useRef<HTMLDivElement>(null);
  useOwlCarousel(galleryRef, SINGLE_CAROUSEL_OPTIONS, gallery.length > 1);

  const handleAddToCart = () => {
    cart.addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: getProductImage(product),
      slug: product.slug,
      metadata: product.metadata,
      freeShipping: product.freeShipping,
      estimatedWeightKg: product.estimatedWeightKg,
      availableFrom: product.availableFrom,
      moq: product.moq,
      unit: product.unit,
      priceTiers: product.priceTiers,
      sellerId: product.seller?.id ?? null,
      sellerName: product.seller?.name ?? null,
    });
    addToast('success', upcoming ? `${product.name} réservé` : `${product.name} ajouté au panier`);
  };

  const handleToggleWishlist = () => {
    wishlist.toggle(product.id);
    addToast('success', wished ? `${product.name} retiré des favoris` : `${product.name} ajouté aux favoris`);
  };

  // Barre latérale : compteurs par catégorie et produits en vedette (les mieux notés, hors produit courant)
  const activeCategories = categories.filter((c) => c.isActive);
  const categoryCounts = catalog.reduce<Record<string, number>>((acc, p) => {
    const slug = normalize(p.category);
    acc[slug] = (acc[slug] || 0) + 1;
    return acc;
  }, {});
  const featured = catalog
    .filter((p) => p.id !== product.id)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || Number(b.images.length > 0) - Number(a.images.length > 0))
    .slice(0, 3);

  const tags = [
    { label: getCategoryLabel(product.category), href: `/produits?categorie=${normalize(product.category)}` },
    ...product.badges.map((badge) => ({ label: getBadgeLabel(badge), href: '/produits' })),
    { label: product.unit, href: '/produits' },
  ];

  return (
    <>
      <PageHeader
        title={product.name}
        crumbs={[
          { label: 'Produits', href: '/produits' },
          { label: getCategoryLabel(product.category), href: `/produits?categorie=${product.category}` },
          { label: product.name },
        ]}
      />

      {/* Single Products */}
      <div className="container-fluid shop py-5">
        <div className="container py-5">
          <div className="row g-4">
            {/* Barre latérale */}
            <div className="col-lg-5 col-xl-3 wow fadeInUp" data-wow-delay="0.1s">
              <form action="/produits" method="get" role="search" className="input-group w-100 mx-auto d-flex mb-4">
                <input
                  type="search"
                  name="q"
                  className="form-control p-3"
                  placeholder="Mots-clés"
                  aria-label="Rechercher un produit"
                />
                <button type="submit" className="input-group-text p-3" aria-label="Lancer la recherche">
                  <i className="fa fa-search"></i>
                </button>
              </form>

              <div className="product-categories mb-4">
                <h4>Catégories</h4>
                <ul className="list-unstyled">
                  {activeCategories.map((category) => (
                    <li key={category.id}>
                      <div className="categories-item">
                        <Link
                          href={`/produits?categorie=${category.slug}`}
                          className={`text-dark${category.slug === normalize(product.category) ? ' fw-bold' : ''}`}
                        >
                          <i className="fas fa-apple-alt text-secondary me-2"></i> {category.name}
                        </Link>
                        <span>({categoryCounts[category.slug] || 0})</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="additional-product mb-4">
                <h4>Bon à savoir</h4>
                <div className="additional-product-item text-dark">
                  <i className="fas fa-boxes text-secondary me-2"></i> Vente en gros uniquement
                </div>
                <div className="additional-product-item text-dark">
                  <i className="fas fa-mobile-alt text-secondary me-2"></i> Paiement par Mobile Money
                </div>
                <div className="additional-product-item text-dark">
                  <i className="fas fa-percent text-secondary me-2"></i> Tarifs dégressifs pour les entreprises
                </div>
              </div>

              {featured.length > 0 && (
                <div className="featured-product mb-4">
                  <h4 className="mb-3">Produits en vedette</h4>
                  {featured.map((item) => (
                    <div key={item.id} className="featured-product-item mb-3">
                      <Link href={`/produits/${item.slug}`} className="rounded me-4 flex-shrink-0" style={{ width: 100, height: 100 }}>
                        <Image
                          src={getProductImage(item)}
                          alt={item.name}
                          width={100}
                          height={100}
                          className="img-fluid rounded"
                          style={{ width: 100, height: 100, objectFit: 'cover', background: '#f5f5f5' }}
                        />
                      </Link>
                      <div>
                        <h6 className="mb-2">
                          <Link href={`/produits/${item.slug}`} className="text-dark">{item.name}</Link>
                        </h6>
                        <div className="d-flex mb-2">
                          <StarRating value={item.rating} count={item.reviewCount} showCount={false} />
                        </div>
                        <div className="d-flex mb-2">
                          <h5 className="fw-bold me-2">{formatPrice(item.price)}</h5>
                          {item.originalPrice && (
                            <h5 className="text-danger text-decoration-line-through">{formatPrice(item.originalPrice)}</h5>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="d-flex justify-content-center my-4">
                    <Link href="/produits" className="btn btn-primary px-4 py-3 rounded-pill w-100">Voir tout</Link>
                  </div>
                </div>
              )}

              <Link href="/inscription">
                <div className="position-relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/electro/img/product-banner-2.jpg" className="img-fluid w-100 rounded" alt="" />
                  <div
                    className="text-center position-absolute d-flex flex-column align-items-center justify-content-center rounded p-4"
                    style={{ width: '100%', height: '100%', top: 0, right: 0, background: 'rgba(242, 139, 0, 0.3)' }}
                  >
                    <h5 className="display-6 text-primary">PRO</h5>
                    <h4 className="text-secondary">Tarifs dégressifs</h4>
                    <span className="btn btn-primary rounded-pill px-4">Créer un compte</span>
                  </div>
                </div>
              </Link>

              <div className="product-tags my-4">
                <h4 className="mb-3">ÉTIQUETTES</h4>
                <div className="product-tags-items bg-light rounded p-3">
                  {tags.map((tag) => (
                    <Link key={tag.label} href={tag.href} className="border rounded py-1 px-2 mb-2 me-1">
                      {tag.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Produit */}
            <div className="col-lg-7 col-xl-9 wow fadeInUp" data-wow-delay="0.1s">
              <div className="row g-4 single-product">
                <div className="col-xl-6">
                  {gallery.length > 1 ? (
                    <div ref={galleryRef} className="single-carousel owl-carousel">
                      {gallery.map((src, index) => (
                        <div
                          key={index}
                          className="single-item"
                          data-dot={`<img class='img-fluid' src='${src}' alt=''>`}
                        >
                          <div className="single-inner bg-light rounded">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} className="img-fluid rounded" alt={`${product.name} - photo ${index + 1}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="single-item">
                      <div className="single-inner bg-light rounded position-relative">
                        <Image
                          src={gallery[0]}
                          alt={product.name}
                          width={700}
                          height={700}
                          sizes="(max-width: 1200px) 100vw, 40vw"
                          className="img-fluid rounded w-100"
                          style={{ aspectRatio: '1 / 1', objectFit: 'contain' }}
                          priority
                        />
                        {product.badges.length > 0 && (
                          <div className="position-absolute top-0 start-0 m-3 d-flex flex-wrap gap-2">
                            {product.badges.map((badge) => (
                              <span key={badge} className="badge rounded-pill bg-primary fs-6">{getBadgeLabel(badge)}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="col-xl-6">
                  <h4 className="fw-bold mb-3">{product.name}</h4>
                  <p className="mb-3">Catégorie : {getCategoryLabel(product.category)}</p>
                  {product.seller && (
                    <p className="mb-3">
                      <i className="fas fa-store text-primary me-2"></i>Vendu par{' '}
                      <Link href={`/vendeurs/${product.seller.id}`} className="text-primary fw-bold">
                        {product.seller.name}
                      </Link>
                      <Link href={`/vendeurs/${product.seller.id}`} className="ms-2 small">
                        Voir la boutique <i className="fas fa-arrow-right"></i>
                      </Link>
                    </p>
                  )}
                  <h5 className="fw-bold mb-3">
                    {formatPrice(unitPrice)} <small className="fw-normal">/{product.unit}</small>
                    {product.originalPrice && <del className="ms-2 fw-normal fs-6">{formatPrice(product.originalPrice)}</del>}
                  </h5>
                  <a href="#avis" className="d-flex mb-4 text-decoration-none" onClick={() => setTab('avis')}>
                    <StarRating value={rating} count={reviewCount} />
                  </a>

                  <div className="mb-3">
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary d-inline-block rounded text-white py-1 px-4 me-2"
                    >
                      <i className="fab fa-facebook-f me-1"></i> Partager
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(product.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary d-inline-block rounded text-white py-1 px-4 ms-2"
                    >
                      <i className="fab fa-twitter ms-1"></i> Partager
                    </a>
                  </div>

                  <div className="d-flex flex-column mb-3">
                    <small>
                      Quantité minimum : <strong className="text-dark">{formatQuantity(product.moq, product.unit)}</strong>
                    </small>
                    <small>
                      Disponibilité :{' '}
                      {upcoming ? (
                        <strong className="text-warning">
                          à partir du {formatDate(product.availableFrom!)} — réservation possible dès maintenant
                        </strong>
                      ) : product.inStock ? (
                        <strong className="text-primary">
                          {product.stockQuantity ? `${product.stockQuantity} en stock` : 'En stock'}
                        </strong>
                      ) : (
                        <strong className="text-danger">Rupture de stock</strong>
                      )}
                    </small>
                    {product.estimatedWeightKg ? (
                      <small>Poids estimé : <strong className="text-dark">{formatWeight(product.estimatedWeightKg)}</strong></small>
                    ) : null}
                    <small>
                      Livraison gratuite :{' '}
                      <strong className="text-dark">
                        {product.freeShipping ? 'Incluse pour ce produit' : 'Dès 200 000 Ar d’achat'}
                      </strong>
                    </small>
                  </div>

                  <p className="mb-4">{product.shortDescription}</p>

                  {isApproved && product.priceTiers.length > 0 ? (
                    <div className="bg-light rounded p-3 mb-4">
                      <h6 className="text-dark mb-2">Tarifs par quantité</h6>
                      <table className="table table-sm mb-0">
                        <tbody>
                          <tr>
                            <td>À partir de {formatQuantity(product.moq, product.unit)}</td>
                            <td className="text-end fw-bold text-dark">{formatPrice(product.price)}</td>
                          </tr>
                          {product.priceTiers
                            .slice()
                            .sort((a, b) => a.minQty - b.minQty)
                            .map((tier) => (
                              <tr key={tier.minQty}>
                                <td>À partir de {formatQuantity(tier.minQty, product.unit)}</td>
                                <td className="text-end fw-bold text-dark">{formatPrice(tier.unitPrice)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    product.priceTiers.length > 0 && (
                      <p className="mb-4">
                        Tarifs dégressifs réservés aux comptes professionnels.{' '}
                        <Link href="/inscription?type=professionnel" className="text-primary fw-bold">
                          Créer un compte professionnel
                        </Link>
                      </p>
                    )
                  )}

                  {canOrder && (product.inStock || upcoming) && (
                    <>
                      <div className="input-group quantity mb-5" style={{ width: 160 }}>
                        <div className="input-group-btn">
                          <button
                            type="button"
                            className="btn btn-sm btn-minus rounded-circle bg-light border"
                            onClick={() => setQuantity(Math.max(minQty, quantity - 1))}
                            aria-label="Diminuer la quantité"
                          >
                            <i className="fa fa-minus"></i>
                          </button>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="form-control form-control-sm text-center border-0"
                          value={quantity}
                          aria-label="Quantité"
                          onChange={(e) => {
                            const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
                            setQuantity(Number.isFinite(n) ? n : minQty);
                          }}
                          onBlur={() => setQuantity(Math.max(minQty, quantity))}
                        />
                        <div className="input-group-btn">
                          <button
                            type="button"
                            className="btn btn-sm btn-plus rounded-circle bg-light border"
                            onClick={() => setQuantity(quantity + 1)}
                            aria-label="Augmenter la quantité"
                          >
                            <i className="fa fa-plus"></i>
                          </button>
                        </div>
                      </div>
                      <div className="d-flex flex-wrap align-items-center gap-3 mb-4">
                        <button
                          type="button"
                          onClick={handleAddToCart}
                          className="btn btn-primary border border-secondary rounded-pill px-4 py-2 text-primary"
                        >
                          <i className="fa fa-shopping-bag me-2 text-white"></i>
                          {upcoming ? 'Réserver' : 'Ajouter au panier'}
                        </button>
                        <button
                          type="button"
                          onClick={handleToggleWishlist}
                          aria-pressed={wished}
                          aria-label={wished ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          className={`btn-wish${wished ? ' active' : ''}`}
                          style={{ width: 44, height: 44 }}
                        >
                          <i className="fas fa-heart"></i>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Onglets Description / Avis */}
                <div className="col-lg-12">
                  <nav>
                    <div className="nav nav-tabs mb-3" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'description'}
                        className={`nav-link border-white border-bottom-0${tab === 'description' ? ' active' : ''}`}
                        onClick={() => setTab('description')}
                      >
                        Description
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={tab === 'avis'}
                        className={`nav-link border-white border-bottom-0${tab === 'avis' ? ' active' : ''}`}
                        onClick={() => setTab('avis')}
                      >
                        Avis ({reviewCount})
                      </button>
                    </div>
                  </nav>
                  <div className="tab-content mb-5">
                    <div className={`tab-pane${tab === 'description' ? ' active' : ''}`} role="tabpanel">
                      <p>{product.description}</p>
                      {product.characteristics && product.characteristics.length > 0 && (
                        <>
                          <b className="fw-bold">Caractéristiques :</b>
                          <ul className="small list-unstyled mt-2">
                            {product.characteristics.map((item, index) => (
                              <li key={index}>
                                <i className="fas fa-check text-primary me-2"></i>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                      <b className="fw-bold">Fiche technique :</b>
                      <table className="table table-sm small mt-2 mb-4" style={{ maxWidth: 560 }}>
                        <tbody>
                          <tr>
                            <th scope="row" className="fw-normal">Catégorie</th>
                            <td className="text-dark">{getCategoryLabel(product.category)}</td>
                          </tr>
                          <tr>
                            <th scope="row" className="fw-normal">Unité de vente</th>
                            <td className="text-dark">{product.unit}</td>
                          </tr>
                          <tr>
                            <th scope="row" className="fw-normal">Quantité minimum</th>
                            <td className="text-dark">{formatQuantity(product.moq, product.unit)}</td>
                          </tr>
                          <tr>
                            <th scope="row" className="fw-normal">Poids estimé</th>
                            <td className="text-dark">
                              {product.estimatedWeightKg ? (
                                <>
                                  {formatWeight(product.estimatedWeightKg)} par {product.unit}{' '}
                                  <span className="text-muted">(indicatif, n’entre pas dans le prix)</span>
                                </>
                              ) : (
                                'Non renseigné'
                              )}
                            </td>
                          </tr>
                          <tr>
                            <th scope="row" className="fw-normal">Livraison</th>
                            <td className="text-dark">
                              {product.freeShipping ? 'Offerte pour ce produit' : 'Gratuite dès 200 000 Ar d’achat'}
                            </td>
                          </tr>
                          {product.seller && (
                            <tr>
                              <th scope="row" className="fw-normal">Vendeur</th>
                              <td className="text-dark">
                                <Link href={`/vendeurs/${product.seller.id}`} className="text-primary">
                                  {product.seller.name}
                                </Link>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      <b className="fw-bold">Conditions de vente :</b>
                      <p className="small">
                        Vente en gros : quantité minimum de {formatQuantity(product.moq, product.unit)}, pour les
                        particuliers comme pour les entreprises. Paiement en ligne par Mobile Money (MVola, Orange Money,
                        Airtel Money) ; votre commande est traitée dès que le paiement est vérifié.
                      </p>
                    </div>
                    <div className={`tab-pane${tab === 'avis' ? ' active' : ''}`} role="tabpanel">
                      <ReviewsList data={reviews} loadFailed={loadFailed} />
                    </div>
                  </div>
                </div>

                <div className="col-lg-12">
                  <ReviewForm slug={product.slug} onSaved={reload} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <RelatedProducts products={relatedProducts} />
    </>
  );
}
