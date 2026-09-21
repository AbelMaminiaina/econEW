'use client';

import { CONTACT } from '@/lib/contact';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import {
  Menu,
  X,
  Search,
  ShoppingCart,
  ShoppingBag,
  Heart,
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
  Package,
  Mail,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useCategories } from '@/hooks/useCategories';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import CartDrawer from '../cart/CartDrawer';

const CONTACT_EMAIL: string = CONTACT.email;

const topbarLink = 'text-warm-500 transition-colors hover:text-electro-primary';
const dropdownItem =
  'flex items-center gap-3 px-4 py-2.5 text-sm text-warm-700 transition-colors hover:bg-electro-primary hover:text-white';

// Logo Electro : sac + nom de la marque
function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" aria-label="All - Accueil" className="inline-flex items-center">
      <ShoppingBag
        className={cn('mr-2 h-8 w-8 lg:h-9 lg:w-9', light ? 'text-white' : 'text-electro-secondary')}
        aria-hidden="true"
      />
      <span
        className={cn(
          'font-display text-4xl font-medium leading-none lg:text-5xl',
          light ? 'text-electro-secondary' : 'text-electro-primary'
        )}
      >
        All
      </span>
    </Link>
  );
}

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCart();
  const wishlist = useWishlist();
  const { data: session, status } = useSession();
  const { isApproved, isCustomer } = useCompanyAccess();
  const { categories } = useCategories();

  const activeCategories = useMemo(() => categories.filter((c) => c.isActive), [categories]);

  const navigation = useMemo(
    () => [
      { name: 'Accueil', href: '/' },
      { name: 'Produits', href: '/produits' },
      { name: 'Vendeurs', href: '/vendeurs' },
      { name: 'Services', href: '/services' },
      { name: 'Blog', href: '/blog' },
      { name: 'Contact', href: '/contact' },
    ],
    []
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCategoriesOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const itemCount = isMounted ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const q = searchQuery.trim();
    if (q) params.set('q', q);
    if (searchCategory) params.set('categorie', searchCategory);
    const qs = params.toString();
    router.push(qs ? `/produits?${qs}` : '/produits');
    setIsMobileMenuOpen(false);
  };

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  const accountLabel = session?.user?.role === 'platform_admin'
    ? null
    : isCustomer
      ? 'Compte particulier'
      : isApproved
        ? 'Compte professionnel approuvé'
        : 'En attente de validation';

  const accountMenu = session ? (
    <div
      className="relative"
      onMouseEnter={() => setIsUserMenuOpen(true)}
      onMouseLeave={() => setIsUserMenuOpen(false)}
    >
      <button
        type="button"
        onClick={() => setIsUserMenuOpen((open) => !open)}
        className={cn('inline-flex items-center gap-2 text-sm', topbarLink)}
        aria-label="Mon compte"
        aria-expanded={isUserMenuOpen}
      >
        <User className="h-4 w-4" />
        <span className="max-w-[160px] truncate">
          {session.user?.companyName || session.user?.name || 'Mon compte'}
        </span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <AnimatePresence>
        {isUserMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 min-w-[230px] pt-2"
          >
            <div className="overflow-hidden rounded-xl border border-warm-200 bg-electro-light py-1 shadow-xl">
              <div className="border-b border-warm-200 px-4 py-3">
                <p className="truncate font-semibold text-warm-800">
                  {session.user?.companyName || session.user?.name}
                </p>
                <p className="truncate text-sm text-warm-500">{session.user?.email}</p>
                {accountLabel && (
                  <p className="mt-1 text-xs font-medium text-electro-primary">{accountLabel}</p>
                )}
              </div>
              <Link href="/suivi-commande" className={dropdownItem}>
                <Package className="h-4 w-4" />
                Mes commandes
              </Link>
              {session.user?.companyStatus === 'approved' && session.user?.role !== 'platform_admin' && (
                <Link href="/vendeur" className={dropdownItem}>
                  <Package className="h-4 w-4" />
                  Espace vendeur
                </Link>
              )}
              {session.user?.role === 'platform_admin' && (
                <Link href="/admin" className={dropdownItem}>
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard Admin
                </Link>
              )}
              <button type="button" onClick={() => signOut()} className={cn(dropdownItem, 'w-full')}>
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  ) : status === 'loading' ? (
    <div className="h-5 w-24 animate-pulse rounded bg-warm-200" />
  ) : (
    <div className="inline-flex items-center gap-2 text-sm">
      <Link href="/connexion" className={topbarLink}>
        Connexion
      </Link>
      <span className="text-warm-400">/</span>
      <Link href="/inscription" className={topbarLink}>
        Créer un compte
      </Link>
    </div>
  );

  return (
    <>
      {/* Topbar (grand écran) */}
      <div className="hidden border-b border-warm-200 bg-white lg:block">
        <div className="mx-auto grid h-11 max-w-[1600px] grid-cols-3 items-center px-6 xl:px-12">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/services" className={topbarLink}>Aide</Link>
            <span className="text-warm-400">/</span>
            <Link href="/suivi-commande" className={topbarLink}>Suivi de commande</Link>
            <span className="text-warm-400">/</span>
            <Link href="/contact" className={topbarLink}>Contact</Link>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-warm-800">Écrivez-nous :</span>
            <a href={`mailto:${CONTACT_EMAIL}`} className={topbarLink}>{CONTACT_EMAIL}</a>
          </div>
          <div className="flex items-center justify-end">{accountMenu}</div>
        </div>
      </div>

      {/* Logo, recherche, panier (grand écran) */}
      <div className="hidden bg-white lg:block">
        <div className="mx-auto grid max-w-[1600px] grid-cols-12 items-center gap-4 px-6 py-4 xl:px-12">
          <div className="col-span-3">
            <Logo />
          </div>
          <form role="search" onSubmit={handleSearch} className="col-span-6 pl-4">
            <div className="flex overflow-hidden rounded-full border border-warm-300 bg-white focus-within:border-electro-primary">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Que recherchez-vous ?"
                aria-label="Rechercher un produit"
                className="min-w-0 flex-1 border-0 bg-transparent px-6 py-3 text-sm text-warm-800 placeholder:text-warm-400 focus:outline-none"
              />
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                aria-label="Catégorie"
                className="w-48 cursor-pointer border-0 border-l border-warm-300 bg-transparent px-3 py-3 text-sm text-warm-800 focus:outline-none"
              >
                <option value="">Toutes les catégories</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
              <button
                type="submit"
                aria-label="Lancer la recherche"
                className="bg-electro-primary px-8 text-white transition-colors duration-500 hover:bg-electro-secondary"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>
          <div className="col-span-3 flex items-center justify-end gap-4">
            <Link
              href="/favoris"
              className="group inline-flex items-center text-warm-500"
              aria-label={`Mes favoris, ${wishlist.count} produit${wishlist.count > 1 ? 's' : ''}`}
            >
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-warm-300 transition-colors group-hover:border-electro-secondary group-hover:text-electro-secondary">
                <Heart className="h-5 w-5" />
                {wishlist.count > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-electro-secondary px-1 text-xs font-bold text-white">
                    {wishlist.count > 99 ? '99+' : wishlist.count}
                  </span>
                )}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="group inline-flex items-center gap-3 text-warm-500"
              aria-label={`Panier, ${itemCount} article${itemCount > 1 ? 's' : ''}`}
            >
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-warm-300 transition-colors group-hover:border-electro-primary group-hover:text-electro-primary">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-electro-secondary px-1 text-xs font-bold text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </span>
              <span className="text-sm text-warm-800">Panier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barre de navigation orange */}
      <div className="sticky top-0 z-40 bg-electro-primary shadow-sm">
        <div className="mx-auto flex max-w-[1600px] items-center px-4 lg:px-6 xl:px-12">
          {/* Toutes les catégories (grand écran) */}
          <div
            className="relative hidden w-[250px] shrink-0 lg:block"
            onMouseEnter={() => setIsCategoriesOpen(true)}
            onMouseLeave={() => setIsCategoriesOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsCategoriesOpen((open) => !open)}
              aria-expanded={isCategoriesOpen}
              className="flex w-full items-center py-3 text-left text-xl font-medium text-white"
            >
              <Menu className="mr-2 h-5 w-5" />
              Catégories
            </button>
            {isCategoriesOpen && (
              <div className="absolute left-0 right-0 top-full z-50 overflow-hidden rounded-b-lg bg-electro-light shadow-xl">
                <ul>
                  <li>
                    <Link
                      href="/produits"
                      className="flex items-center justify-between border-b border-white/60 px-4 py-2 text-electro-dark transition-colors hover:bg-electro-primary hover:text-white"
                    >
                      Tous les produits
                    </Link>
                  </li>
                  {activeCategories.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/produits?categorie=${c.slug}`}
                        className="flex items-center justify-between border-b border-white/60 px-4 py-2 text-electro-dark transition-colors last:border-b-0 hover:bg-electro-primary hover:text-white"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Logo (mobile) */}
          <div className="py-2 lg:hidden">
            <Logo light />
          </div>

          {/* Navigation (grand écran) */}
          <nav className="ml-auto hidden items-center lg:flex" aria-label="Navigation principale">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'px-4 py-[18px] font-display text-[17px] font-medium transition-colors duration-500 hover:text-white',
                  isActive(item.href) ? 'text-white' : 'text-electro-dark'
                )}
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/inscription"
              className="ml-2 inline-flex items-center gap-2 rounded-full bg-electro-secondary px-4 py-2 text-sm font-medium text-white transition-colors duration-500 hover:bg-white hover:text-electro-secondary"
            >
              <Building2 className="h-4 w-4" />
              Devenir client pro
            </Link>
          </nav>

          {/* Actions (mobile) */}
          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <Link
              href="/favoris"
              className="relative rounded-md p-2 text-white"
              aria-label={`Mes favoris, ${wishlist.count} produit${wishlist.count > 1 ? 's' : ''}`}
            >
              <Heart className="h-6 w-6" />
              {wishlist.count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-electro-secondary px-1 text-xs font-bold text-white">
                  {wishlist.count > 99 ? '99+' : wishlist.count}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative rounded-md p-2 text-white"
              aria-label={`Panier, ${itemCount} article${itemCount > 1 ? 's' : ''}`}
            >
              <ShoppingCart className="h-6 w-6" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-electro-secondary px-1 text-xs font-bold text-white">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((open) => !open)}
              className="rounded-md border border-white/60 p-2 text-white"
              aria-label="Menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="max-h-[80vh] overflow-y-auto bg-electro-primary lg:hidden"
              aria-label="Navigation mobile"
            >
              <div className="space-y-4 px-4 pb-5">
                <form role="search" onSubmit={handleSearch}>
                  <div className="flex overflow-hidden rounded-full bg-white">
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Que recherchez-vous ?"
                      aria-label="Rechercher un produit"
                      className="min-w-0 flex-1 border-0 bg-transparent px-5 py-3 text-sm text-warm-800 focus:outline-none"
                    />
                    <button
                      type="submit"
                      aria-label="Lancer la recherche"
                      className="bg-electro-secondary px-5 text-white"
                    >
                      <Search className="h-5 w-5" />
                    </button>
                  </div>
                </form>

                <div className="flex flex-col">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                      className={cn(
                        'py-2 font-display text-[17px] font-medium',
                        isActive(item.href) ? 'text-white' : 'text-electro-dark'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                  <Link href="/suivi-commande" className="py-2 font-display text-[17px] font-medium text-electro-dark">
                    Suivi de commande
                  </Link>
                </div>

                {activeCategories.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-white">Catégories</p>
                    <ul className="overflow-hidden rounded-lg bg-electro-light">
                      {activeCategories.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={`/produits?categorie=${c.slug}`}
                            className="block border-b border-white/60 px-4 py-2 text-electro-dark last:border-b-0"
                          >
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {session ? (
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-sm font-medium text-electro-secondary"
                  >
                    <LogOut className="h-4 w-4" />
                    Se déconnecter
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/connexion"
                      className="inline-flex items-center justify-center rounded-full bg-white py-2.5 text-sm font-medium text-electro-dark"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/inscription"
                      className="inline-flex items-center justify-center rounded-full bg-electro-secondary py-2.5 text-sm font-medium text-white"
                    >
                      Créer un compte
                    </Link>
                  </div>
                )}

                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center justify-center gap-2 text-sm text-white"
                >
                  <Mail className="h-4 w-4" />
                  {CONTACT_EMAIL}
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>

      {/* Panier */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

export default Header;
