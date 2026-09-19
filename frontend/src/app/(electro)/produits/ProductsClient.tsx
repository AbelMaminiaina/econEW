'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import type { Product, ProductBadge } from '@/types';
import { useCategories } from '@/hooks/useCategories';
import { formatPrice, getBadgeLabel, getProductImage, isUpcoming } from '@/lib/utils';
import { PageHeader } from '@/components/electro/PageHeader';
import { StarRating } from '@/components/electro/StarRating';
import ProductGrid from '@/components/electro/ProductGrid';
import ProductMiniCard from '@/components/electro/ProductMiniCard';
import { ServicesBar } from '@/components/electro/home/ServicesBar';
import { PromoBanners } from '@/components/electro/home/PromoBanners';
import { ProductBanners } from '@/components/electro/home/ProductBanners';

interface ProductsClientProps {
  initialProducts: Product[];
}

type SortKey = 'default' | 'popularity' | 'newness' | 'rating' | 'price-asc' | 'price-desc';
type ViewMode = 'grid' | 'list';
type Availability = 'all' | 'stock' | 'preorder' | 'out';

const PAGE_SIZE = 9;
const normalize = (slug: string) => slug.replace(/_/g, '-');
const unitLabel = (unit: string) => (unit === 'piece' ? 'pièce' : unit);

const availabilityOf = (p: Product): Exclude<Availability, 'all'> =>
  isUpcoming(p.availableFrom) ? 'preorder' : p.inStock ? 'stock' : 'out';

// Page « Shop » du template Electro (shop.html) : barre latérale de filtres, bannière, recherche +
// tri + vue grille/liste, cartes produit, pagination.
function ProductsContent({ initialProducts }: ProductsClientProps) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('categorie');
  const query = (searchParams.get('q') ?? '').trim();
  const { categories } = useCategories();
  const resultsRef = useRef<HTMLDivElement>(null);

  const priceMax = useMemo(() => {
    const max = initialProducts.reduce((m, p) => Math.max(m, p.price), 0);
    return Math.max(1000, Math.ceil(max / 1000) * 1000);
  }, [initialProducts]);

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || 'all');
  const [search, setSearch] = useState(query);
  const [priceCap, setPriceCap] = useState<number | null>(null);
  const [availability, setAvailability] = useState<Availability>('all');
  const [unit, setUnit] = useState<string>('all');
  const [tag, setTag] = useState<ProductBadge | null>(null);
  const [sort, setSort] = useState<SortKey>('default');
  const [view, setView] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSelectedCategory(categoryParam || 'all');
  }, [categoryParam]);

  useEffect(() => {
    setSearch(query);
  }, [query]);

  const cap = priceCap ?? priceMax;

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const list = initialProducts.filter((p) => {
      const inCategory = selectedCategory === 'all' || normalize(p.category) === normalize(selectedCategory);
      const matchesQuery =
        !needle || `${p.name} ${p.shortDescription} ${p.description}`.toLowerCase().includes(needle);
      return (
        inCategory &&
        matchesQuery &&
        p.price <= cap &&
        (availability === 'all' || availabilityOf(p) === availability) &&
        (unit === 'all' || p.unit === unit) &&
        (!tag || p.badges.includes(tag))
      );
    });

    const byBadge = (badge: ProductBadge) => (a: Product, b: Product) =>
      Number(b.badges.includes(badge)) - Number(a.badges.includes(badge));
    switch (sort) {
      case 'popularity':
        return [...list].sort(byBadge('populaire'));
      case 'newness':
        return [...list].sort(
          (a, b) => Number(b.badges.includes('nouveau')) - Number(a.badges.includes('nouveau')) ||
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'rating':
        return [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0));
      case 'price-asc':
        return [...list].sort((a, b) => a.price - b.price);
      case 'price-desc':
        return [...list].sort((a, b) => b.price - a.price);
      default:
        return list;
    }
  }, [initialProducts, selectedCategory, search, cap, availability, unit, tag, sort]);

  // Tout changement de filtre ramène à la première page
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, search, cap, availability, unit, tag, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const goToPage = (n: number) => {
    setPage(Math.min(pageCount, Math.max(1, n)));
    resultsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialProducts.forEach((p) => {
      const slug = normalize(p.category);
      counts[slug] = (counts[slug] || 0) + 1;
    });
    return counts;
  }, [initialProducts]);

  const availabilityCounts = useMemo(() => {
    const counts = { stock: 0, preorder: 0, out: 0 };
    initialProducts.forEach((p) => {
      counts[availabilityOf(p)] += 1;
    });
    return counts;
  }, [initialProducts]);

  const units = useMemo(() => {
    const map = new Map<string, number>();
    initialProducts.forEach((p) => map.set(p.unit, (map.get(p.unit) ?? 0) + 1));
    return Array.from(map.entries());
  }, [initialProducts]);

  const tags = useMemo(() => {
    const set = new Set<ProductBadge>();
    initialProducts.forEach((p) => p.badges.forEach((b) => set.add(b)));
    return Array.from(set);
  }, [initialProducts]);

  // « Produits en vedette » : populaires / nouveaux d'abord, avec photo
  const featured = useMemo(() => {
    const score = (p: Product) =>
      Number(p.badges.includes('populaire')) * 2 + Number(p.badges.includes('nouveau')) + Number(p.images.length > 0) * 3;
    return [...initialProducts].sort((a, b) => score(b) - score(a)).slice(0, 3);
  }, [initialProducts]);

  const activeCategories = categories.filter((c) => c.isActive);
  const selectedName =
    selectedCategory === 'all' ? null : activeCategories.find((c) => c.slug === selectedCategory)?.name;
  const hasFilters =
    selectedCategory !== 'all' || search.trim() !== '' || priceCap !== null || availability !== 'all' || unit !== 'all' || tag !== null;

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearch('');
    setPriceCap(null);
    setAvailability('all');
    setUnit('all');
    setTag(null);
  };

  return (
    <>
      <PageHeader
        title={selectedName ?? 'Nos produits'}
        crumbs={selectedName ? [{ label: 'Produits', href: '/produits' }, { label: selectedName }] : [{ label: 'Produits' }]}
      />

      <ServicesBar />
      <PromoBanners />

      <div className="container-fluid shop py-5">
        <div className="container py-5">
          <div className="row g-4">
            {/* Barre latérale */}
            <div className="col-lg-3 wow fadeInUp" data-wow-delay="0.1s">
              <div className="product-categories mb-4">
                <h4>Catégories</h4>
                <ul className="list-unstyled">
                  <li>
                    <div className="categories-item">
                      <Link
                        href="/produits"
                        className={`text-dark${selectedCategory === 'all' ? ' fw-bold' : ''}`}
                        onClick={() => setSelectedCategory('all')}
                      >
                        <i className="fas fa-apple-alt text-secondary me-2"></i> Tous les produits
                      </Link>
                      <span>({initialProducts.length})</span>
                    </div>
                  </li>
                  {activeCategories.map((category) => (
                    <li key={category.id}>
                      <div className="categories-item">
                        <Link
                          href={`/produits?categorie=${category.slug}`}
                          className={`text-dark${selectedCategory === category.slug ? ' fw-bold' : ''}`}
                          onClick={() => setSelectedCategory(category.slug)}
                        >
                          <i className="fas fa-apple-alt text-secondary me-2"></i> {category.name}
                        </Link>
                        <span>({categoryCounts[category.slug] || 0})</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="price mb-4">
                <h4 className="mb-2">Prix</h4>
                <input
                  type="range"
                  className="form-range w-100"
                  id="rangeInput"
                  name="rangeInput"
                  min={0}
                  max={priceMax}
                  step={1000}
                  value={cap}
                  aria-label="Prix maximum"
                  onChange={(e) => setPriceCap(Number(e.target.value) >= priceMax ? null : Number(e.target.value))}
                />
                <output id="amount" htmlFor="rangeInput">
                  Jusqu&apos;à {formatPrice(cap)}
                </output>
              </div>

              <div className="product-color mb-3">
                <h4>Disponibilité</h4>
                <ul className="list-unstyled">
                  {(
                    [
                      ['stock', 'En stock'],
                      ['preorder', 'Sur réservation'],
                      ['out', 'Rupture de stock'],
                    ] as const
                  )
                    .filter(([key]) => availabilityCounts[key] > 0)
                    .map(([key, label]) => (
                      <li key={key}>
                        <div className="product-color-item">
                          <a
                            href="#"
                            className={`text-dark${availability === key ? ' fw-bold' : ''}`}
                            onClick={(e) => {
                              e.preventDefault();
                              setAvailability(availability === key ? 'all' : key);
                            }}
                          >
                            <i className="fas fa-apple-alt text-secondary me-2"></i> {label}
                          </a>
                          <span className="ms-auto">({availabilityCounts[key]})</span>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>

              <div className="additional-product mb-4">
                <h4>Vendu par</h4>
                <div className="additional-product-item">
                  <input
                    type="radio"
                    className="me-2"
                    id="unit-all"
                    name="unit"
                    checked={unit === 'all'}
                    onChange={() => setUnit('all')}
                  />
                  <label htmlFor="unit-all" className="text-dark">Toutes les unités</label>
                </div>
                {units.map(([value, count]) => (
                  <div key={value} className="additional-product-item">
                    <input
                      type="radio"
                      className="me-2"
                      id={`unit-${value}`}
                      name="unit"
                      checked={unit === value}
                      onChange={() => setUnit(value)}
                    />
                    <label htmlFor={`unit-${value}`} className="text-dark">
                      {unitLabel(value)} ({count})
                    </label>
                  </div>
                ))}
              </div>

              <div className="featured-product mb-4">
                <h4 className="mb-3">Produits en vedette</h4>
                {featured.map((product) => (
                  <div key={product.id} className="featured-product-item mb-3">
                    <Link href={`/produits/${product.slug}`} className="rounded me-4 flex-shrink-0" style={{ width: 100, height: 100 }}>
                      <Image
                        src={getProductImage(product)}
                        alt={product.name}
                        width={100}
                        height={100}
                        className="img-fluid rounded"
                        style={{ width: 100, height: 100, objectFit: 'cover', background: '#f5f5f5' }}
                      />
                    </Link>
                    <div>
                      <h6 className="mb-2">
                        <Link href={`/produits/${product.slug}`} className="text-dark">{product.name}</Link>
                      </h6>
                      <div className="d-flex mb-2">
                        <StarRating value={product.rating} count={product.reviewCount} showCount={false} />
                      </div>
                      <div className="d-flex mb-2">
                        <h5 className="fw-bold me-2">{formatPrice(product.price)}</h5>
                        {product.originalPrice && (
                          <h5 className="text-danger text-decoration-line-through">{formatPrice(product.originalPrice)}</h5>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="d-flex justify-content-center my-4">
                  <Link
                    href="/produits"
                    className="btn btn-primary px-4 py-3 rounded-pill w-100"
                    onClick={resetFilters}
                  >
                    Voir tout
                  </Link>
                </div>
              </div>

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

              {tags.length > 0 && (
                <div className="product-tags py-4">
                  <h4 className="mb-3">ÉTIQUETTES</h4>
                  <div className="product-tags-items bg-light rounded p-3">
                    {tags.map((badge) => (
                      <a
                        key={badge}
                        href="#"
                        className={`border rounded py-1 px-2 mb-2 me-1${tag === badge ? ' bg-primary text-white' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setTag(tag === badge ? null : badge);
                        }}
                      >
                        {getBadgeLabel(badge)}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Résultats */}
            <div className="col-lg-9 wow fadeInUp" data-wow-delay="0.1s" ref={resultsRef} style={{ scrollMarginTop: 90 }}>
              <div className="rounded mb-4 position-relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/electro/img/product-banner-3.jpg" className="img-fluid rounded w-100" style={{ height: 250, objectFit: 'cover' }} alt="" />
                <div
                  className="position-absolute rounded d-flex flex-column align-items-center justify-content-center text-center"
                  style={{ width: '100%', height: 250, top: 0, left: 0, background: 'rgba(242, 139, 0, 0.3)' }}
                >
                  <h4 className="display-5 text-primary">PRO</h4>
                  <h3 className="display-4 text-white mb-4">Tarifs dégressifs par quantité</h3>
                  <Link href="/inscription" className="btn btn-primary rounded-pill">Créer un compte pro</Link>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-xl-7">
                  <form role="search" onSubmit={(e) => e.preventDefault()} className="input-group w-100 mx-auto d-flex">
                    <input
                      type="search"
                      className="form-control p-3"
                      placeholder="Mots-clés"
                      aria-label="Rechercher un produit"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <span id="search-icon-1" className="input-group-text p-3">
                      <i className="fa fa-search"></i>
                    </span>
                  </form>
                </div>
                <div className="col-xl-3 text-end">
                  <div className="bg-light ps-3 py-3 rounded d-flex justify-content-between">
                    <label htmlFor="sort-by">Trier par :</label>
                    <select
                      id="sort-by"
                      className="border-0 form-select-sm bg-light me-3"
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                    >
                      <option value="default">Tri par défaut</option>
                      <option value="popularity">Popularité</option>
                      <option value="newness">Nouveautés</option>
                      <option value="rating">Note moyenne</option>
                      <option value="price-asc">Prix croissant</option>
                      <option value="price-desc">Prix décroissant</option>
                    </select>
                  </div>
                </div>
                <div className="col-lg-4 col-xl-2">
                  <ul className="nav nav-pills d-inline-flex text-center py-2 px-2 rounded bg-light mb-4" role="tablist" aria-label="Affichage">
                    <li className="nav-item me-4">
                      <a
                        href="#grille"
                        role="tab"
                        aria-selected={view === 'grid'}
                        aria-label="Vue grille"
                        className="bg-light"
                        onClick={(e) => {
                          e.preventDefault();
                          setView('grid');
                        }}
                      >
                        <i className={`fas fa-th fa-3x ${view === 'grid' ? 'text-primary' : 'text-muted'}`}></i>
                      </a>
                    </li>
                    <li className="nav-item">
                      <a
                        href="#liste"
                        role="tab"
                        aria-selected={view === 'list'}
                        aria-label="Vue liste"
                        className="bg-light"
                        onClick={(e) => {
                          e.preventDefault();
                          setView('list');
                        }}
                      >
                        <i className={`fas fa-bars fa-3x ${view === 'list' ? 'text-primary' : 'text-muted'}`}></i>
                      </a>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center mb-4">
                <p className="mb-0" role="status">
                  {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''}
                  {search.trim() && <> pour «&nbsp;{search.trim()}&nbsp;»</>}
                </p>
                {hasFilters && (
                  <button type="button" className="btn btn-light rounded-pill py-2 px-4" onClick={resetFilters}>
                    <i className="fas fa-times me-2"></i>Réinitialiser les filtres
                  </button>
                )}
              </div>

              {view === 'grid' ? (
                <div className="tab-content">
                  <div className="tab-pane fade show p-0 active">
                    <ProductGrid products={pageProducts} columns={3} />
                  </div>
                </div>
              ) : pageProducts.length === 0 ? (
                <p className="text-center fs-5">Aucun produit ne correspond à votre recherche.</p>
              ) : (
                <div className="products p-0">
                  <div className="row g-4 products-mini">
                    {pageProducts.map((product) => (
                      <div key={product.id} className="col-lg-6">
                        <ProductMiniCard product={product} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pageCount > 1 && (
                <nav aria-label="Pagination" className="pagination d-flex justify-content-center mt-5">
                  <a
                    href="#"
                    className="rounded"
                    aria-label="Page précédente"
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(currentPage - 1);
                    }}
                  >
                    &laquo;
                  </a>
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                    <a
                      key={n}
                      href="#"
                      className={`rounded${n === currentPage ? ' active' : ''}`}
                      aria-current={n === currentPage ? 'page' : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(n);
                      }}
                    >
                      {n}
                    </a>
                  ))}
                  <a
                    href="#"
                    className="rounded"
                    aria-label="Page suivante"
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(currentPage + 1);
                    }}
                  >
                    &raquo;
                  </a>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProductBanners />
    </>
  );
}

export default function ProductsClient({ initialProducts }: ProductsClientProps) {
  return (
    <Suspense fallback={<div className="container py-5 text-center">Chargement…</div>}>
      <ProductsContent initialProducts={initialProducts} />
    </Suspense>
  );
}
