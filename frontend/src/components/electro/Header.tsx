'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useCategories } from '@/hooks/useCategories';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import { formatPrice, resolveUnitPrice } from '@/lib/utils';

const CONTACT_EMAIL = 'contact@all.mg';

const NAV = [
  { name: 'Accueil', href: '/' },
  { name: 'Produits', href: '/produits' },
  { name: 'Vendeurs', href: '/vendeurs' },
  { name: 'Services', href: '/services' },
  { name: 'Blog', href: '/blog' },
  { name: 'Contact', href: '/contact' },
];

// En-tête du template Electro (index.html) : topbar, logo + recherche + panier, barre orange.
export function ElectroHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCart();
  const wishlist = useWishlist();
  const { data: session, status } = useSession();
  const { isApproved, isCustomer } = useCompanyAccess();
  const { categories } = useCategories();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sticky, setSticky] = useState(false);

  const activeCategories = categories.filter((c) => c.isActive);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.items.reduce(
    (sum, item) => sum + (isApproved ? resolveUnitPrice(item.price, item.priceTiers, item.quantity) : item.price) * item.quantity,
    0
  );

  // Comme main.js : la barre orange devient collante après 45 px de défilement
  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 45);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Referme les menus Bootstrap (collapse) à chaque changement de page
  useEffect(() => {
    document.querySelectorAll('#navbarCollapse.show, #allCat.show').forEach((el) => el.classList.remove('show'));
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('categorie', category);
    const qs = params.toString();
    router.push(qs ? `/produits?${qs}` : '/produits');
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const accountLabel = isCustomer ? 'Compte particulier' : isApproved ? 'Compte professionnel' : 'En attente de validation';

  return (
    <>
      {/* Topbar */}
      <div className="container-fluid px-5 d-none border-bottom d-lg-block">
        <div className="row gx-0 align-items-center">
          <div className="col-lg-4 text-center text-lg-start mb-lg-0">
            <div className="d-inline-flex align-items-center" style={{ height: 45 }}>
              <Link href="/services" className="text-muted me-2">Aide</Link>
              <small> / </small>
              <Link href="/suivi-commande" className="text-muted mx-2">Suivi de commande</Link>
              <small> / </small>
              <Link href="/contact" className="text-muted ms-2">Contact</Link>
            </div>
          </div>
          <div className="col-lg-4 text-center d-flex align-items-center justify-content-center">
            <small className="text-dark">Écrivez-nous :&nbsp;</small>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-muted">{CONTACT_EMAIL}</a>
          </div>
          <div className="col-lg-4 text-center text-lg-end">
            <div className="d-inline-flex align-items-center" style={{ height: 45 }}>
              {session ? (
                <div className="dropdown">
                  <a href="#" className="dropdown-toggle text-muted ms-2" data-bs-toggle="dropdown">
                    <small>
                      <i className="fa fa-user me-2"></i>
                      {session.user?.companyName || session.user?.name || 'Mon compte'}
                    </small>
                  </a>
                  <div className="dropdown-menu dropdown-menu-end rounded">
                    {session.user?.role !== 'platform_admin' && (
                      <span className="dropdown-item-text small text-primary">{accountLabel}</span>
                    )}
                    <Link href="/suivi-commande" className="dropdown-item">Mes commandes</Link>
                    <Link href="/favoris" className="dropdown-item">Mes favoris</Link>
                    {session.user?.companyStatus === 'approved' && session.user?.role !== 'platform_admin' && (
                      <Link href="/vendeur" className="dropdown-item">Espace vendeur</Link>
                    )}
                    {session.user?.role === 'platform_admin' && (
                      <Link href="/admin" className="dropdown-item">Dashboard Admin</Link>
                    )}
                    <button type="button" className="dropdown-item" onClick={() => signOut()}>
                      Se déconnecter
                    </button>
                  </div>
                </div>
              ) : status === 'loading' ? null : (
                <>
                  <Link href="/connexion" className="text-muted me-2"><small>Connexion</small></Link>
                  <small> / </small>
                  <Link href="/inscription" className="text-muted ms-2"><small>Créer un compte</small></Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logo, recherche, favoris, panier */}
      <div className="container-fluid px-5 py-4 d-none d-lg-block">
        <div className="row gx-0 align-items-center text-center">
          <div className="col-md-4 col-lg-3 text-center text-lg-start">
            <div className="d-inline-flex align-items-center">
              <Link href="/" className="navbar-brand p-0" aria-label="All - Accueil">
                <h1 className="display-5 text-primary m-0">
                  <i className="fas fa-shopping-bag text-secondary me-2"></i>All
                </h1>
              </Link>
            </div>
          </div>
          <div className="col-md-4 col-lg-6 text-center">
            <form role="search" onSubmit={handleSearch} className="position-relative ps-4">
              <div className="d-flex border rounded-pill">
                <input
                  className="form-control border-0 rounded-pill w-100 py-3"
                  type="search"
                  placeholder="Que recherchez-vous ?"
                  aria-label="Rechercher un produit"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <select
                  className="form-select text-dark border-0 border-start rounded-0 p-3"
                  style={{ width: 220 }}
                  aria-label="Catégorie"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Toutes les catégories</option>
                  {activeCategories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary rounded-pill py-3 px-5" style={{ border: 0 }} aria-label="Lancer la recherche">
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </form>
          </div>
          <div className="col-md-4 col-lg-3 text-center text-lg-end">
            <div className="d-inline-flex align-items-center">
              <Link
                href="/favoris"
                className="text-muted d-flex align-items-center justify-content-center me-3 position-relative"
                aria-label={`Mes favoris, ${wishlist.count} produit${wishlist.count > 1 ? 's' : ''}`}
              >
                <span className="rounded-circle btn-md-square border"><i className="fas fa-heart"></i></span>
                {wishlist.count > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-secondary">
                    {wishlist.count}
                  </span>
                )}
              </Link>
              <Link
                href="/panier"
                className="text-muted d-flex align-items-center justify-content-center position-relative"
                aria-label={`Panier, ${itemCount} article${itemCount > 1 ? 's' : ''}`}
              >
                <span className="rounded-circle btn-md-square border"><i className="fas fa-shopping-cart"></i></span>
                {itemCount > 0 && (
                  <span className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-secondary">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
                <span className="text-dark ms-2">{formatPrice(cartTotal)}</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Barre de navigation orange */}
      <div className={`container-fluid nav-bar p-0${sticky ? ' sticky-top shadow-sm' : ''}`}>
        <div className="row gx-0 bg-primary px-5 align-items-center">
          <div className="col-lg-3 d-none d-lg-block">
            <nav className="navbar navbar-light position-relative" style={{ width: 250 }}>
              <button
                className="navbar-toggler border-0 fs-4 w-100 px-0 text-start"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#allCat"
              >
                <h4 className="m-0"><i className="fa fa-bars me-2"></i>Catégories</h4>
              </button>
              <div className="collapse navbar-collapse rounded-bottom" id="allCat">
                <div className="navbar-nav ms-auto py-0">
                  <ul className="list-unstyled categories-bars">
                    <li>
                      <div className="categories-bars-item">
                        <Link href="/produits">Tous les produits</Link>
                      </div>
                    </li>
                    {activeCategories.map((c) => (
                      <li key={c.id}>
                        <div className="categories-bars-item">
                          <Link href={`/produits?categorie=${c.slug}`}>{c.name}</Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </nav>
          </div>
          <div className="col-12 col-lg-9">
            <nav className="navbar navbar-expand-lg navbar-light bg-primary">
              <Link href="/" className="navbar-brand d-block d-lg-none" aria-label="All - Accueil">
                <h1 className="display-5 text-secondary m-0">
                  <i className="fas fa-shopping-bag text-white me-2"></i>All
                </h1>
              </Link>
              <div className="ms-auto d-flex align-items-center d-lg-none">
                <Link href="/favoris" className="text-white me-3 position-relative" aria-label="Mes favoris">
                  <i className="fas fa-heart fa-lg"></i>
                  {wishlist.count > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-secondary">{wishlist.count}</span>
                  )}
                </Link>
                <Link href="/panier" className="text-white me-3 position-relative" aria-label="Panier">
                  <i className="fas fa-shopping-cart fa-lg"></i>
                  {itemCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-secondary">{itemCount}</span>
                  )}
                </Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse" aria-label="Menu">
                  <span className="fa fa-bars fa-1x"></span>
                </button>
              </div>
              <div className="collapse navbar-collapse" id="navbarCollapse">
                <div className="navbar-nav ms-auto py-0">
                  {NAV.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`nav-item nav-link${isActive(item.href) ? ' active' : ''}`}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <Link href="/suivi-commande" className="nav-item nav-link d-lg-none">Suivi de commande</Link>
                  <div className="nav-item dropdown d-block d-lg-none mb-3">
                    <a href="#" className="nav-link dropdown-toggle" data-bs-toggle="dropdown">Catégories</a>
                    <div className="dropdown-menu m-0">
                      <ul className="list-unstyled categories-bars">
                        {activeCategories.map((c) => (
                          <li key={c.id}>
                            <div className="categories-bars-item">
                              <Link href={`/produits?categorie=${c.slug}`}>{c.name}</Link>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {!session && (
                    <div className="d-lg-none mb-3 d-flex gap-2">
                      <Link href="/connexion" className="btn btn-light rounded-pill py-2 px-4">Connexion</Link>
                      <Link href="/inscription" className="btn btn-secondary rounded-pill py-2 px-4">Créer un compte</Link>
                    </div>
                  )}
                </div>
                <Link href="/inscription" className="btn btn-secondary rounded-pill py-2 px-4 px-lg-3 mb-3 mb-md-3 mb-lg-0">
                  <i className="fa fa-building me-2"></i> Devenir client pro
                </Link>
              </div>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}

export default ElectroHeader;
