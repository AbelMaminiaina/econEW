'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signOut } from 'next-auth/react';
import {
  Menu,
  X,
  Search,
  ShoppingCart,
  ChevronDown,
  User,
  LogOut,
  Sparkles,
  Building2,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useCategories } from '@/hooks/useCategories';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import CartDrawer from '../cart/CartDrawer';

const submenuVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const ghostButton =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-warm-700 transition-colors hover:bg-warm-100 hover:text-warm-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-prairie-500';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-prairie-500 px-3 py-1.5 text-sm font-medium text-warm-900 shadow transition-colors hover:bg-prairie-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-prairie-500 focus-visible:ring-offset-2';

interface SearchFormProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
}

function SearchForm({ value, onChange, onSubmit, className, inputClassName, autoFocus }: SearchFormProps) {
  return (
    <form role="search" onSubmit={onSubmit} className={cn('relative', className)}>
      <input
        type="search"
        placeholder="Rechercher un produit…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full border border-warm-300 bg-white pl-10 pr-4 text-sm transition-all placeholder:text-warm-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-prairie-500',
          inputClassName
        )}
        aria-label="Rechercher un produit"
        autoFocus={autoFocus}
      />
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" />
    </form>
  );
}

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const cart = useCart();
  const { data: session, status } = useSession();
  const { isApproved, isCustomer } = useCompanyAccess();
  const { categories } = useCategories();

  // Menu de navigation avec les catégories dynamiques
  const navigation = useMemo(() => {
    const produitsSubmenu = [
      { name: 'Tous les produits', href: '/produits', icon: Sparkles, color: 'text-purple-500' },
      ...categories
        .filter((c) => c.isActive)
        .map((c) => ({
          name: c.name,
          href: `/produits?categorie=${c.slug}`,
          icon: Package,
          color: 'text-gray-500',
        })),
    ];

    return [
      { name: 'Accueil', href: '/' },
      {
        name: 'Produits',
        href: '/produits',
        submenu: produitsSubmenu,
      },
      { name: 'Services', href: '/services' },
      { name: 'Blog', href: '/blog' },
      { name: 'Contact', href: '/contact' },
    ];
  }, [categories]);

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setOpenSubmenu(null);
  }, [pathname]);

  const itemCount = isMounted ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/produits?q=${encodeURIComponent(q)}` : '/produits');
    setIsSearchOpen(false);
  };

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 border-b border-warm-200 transition-all duration-300',
          isScrolled ? 'bg-white/95 shadow-lg backdrop-blur-xl' : 'bg-white/80 shadow-sm backdrop-blur-md'
        )}
      >
        {/* Bandeau d'information */}
        <div className="hidden bg-prairie-50 py-1.5 text-center text-xs font-medium text-prairie-800 sm:block">
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Tarifs dégressifs et facturation à 30/60 jours pour les comptes professionnels approuvés
          </span>
        </div>

        <div className="container mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8 lg:space-x-12">
              {/* Logo */}
              <Link
                href="/"
                className="text-2xl font-bold tracking-tight text-prairie-700 transition-colors hover:text-prairie-800"
                aria-label="All - Accueil"
              >
                All
              </Link>

              {/* Desktop navigation */}
              <nav className="hidden items-center space-x-1 lg:flex" aria-label="Navigation principale">
                {navigation.map((item) => (
                  <div
                    key={item.name}
                    className="relative"
                    onMouseEnter={() => item.submenu && setOpenSubmenu(item.name)}
                    onMouseLeave={() => setOpenSubmenu(null)}
                  >
                    <Link
                      href={item.href}
                      aria-current={pathname === item.href ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                        pathname === item.href
                          ? 'bg-prairie-100 text-warm-900 shadow-md'
                          : 'text-warm-700 hover:bg-warm-100 hover:text-warm-900'
                      )}
                    >
                      <span>{item.name}</span>
                      {item.submenu && (
                        <ChevronDown
                          className={cn('h-4 w-4 transition-transform', openSubmenu === item.name && 'rotate-180')}
                        />
                      )}
                    </Link>

                    {/* Sous-menu */}
                    {item.submenu && openSubmenu === item.name && (
                      <div className="absolute left-1/2 top-full -translate-x-1/2 pt-2">
                        <div className="relative min-w-[280px] rounded-2xl border border-warm-200 bg-white p-2 shadow-xl">
                          <div className="grid gap-1">
                            {item.submenu.map((subitem) => {
                              const IconComponent = subitem.icon;
                              return (
                                <Link
                                  key={subitem.name}
                                  href={subitem.href}
                                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-warm-700 transition-colors hover:bg-prairie-50"
                                >
                                  <div className={cn('rounded-lg bg-warm-50 p-2', subitem.color)}>
                                    <IconComponent className="h-4 w-4" />
                                  </div>
                                  <span className="font-medium">{subitem.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>

            {/* Recherche (grand écran) */}
            <div className="mx-8 hidden max-w-md flex-1 xl:flex">
              <SearchForm
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                className="w-full"
                inputClassName="rounded-full py-2"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="rounded-full p-2 transition-colors hover:bg-warm-100 xl:hidden"
                aria-label="Rechercher"
                aria-expanded={isSearchOpen}
              >
                <Search className="h-5 w-5 text-warm-700" />
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="rounded-full p-2 transition-colors hover:bg-warm-100 lg:hidden"
                aria-label="Menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6 text-warm-700" /> : <Menu className="h-6 w-6 text-warm-700" />}
              </button>

              {/* Panier */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="group relative rounded-full p-2 transition-all duration-200 hover:bg-warm-100"
                aria-label={`Panier, ${itemCount} article${itemCount > 1 ? 's' : ''}`}
              >
                <ShoppingCart className="h-6 w-6 text-warm-700 transition-colors group-hover:text-warm-900" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-prairie-600 px-1 text-xs font-bold text-white">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </button>

              {/* Compte */}
              {status === 'loading' ? (
                <div className="h-9 w-9 animate-pulse rounded-full bg-warm-200" />
              ) : session ? (
                <div
                  className="relative"
                  onMouseEnter={() => setIsUserMenuOpen(true)}
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <button
                    className="flex items-center gap-2 rounded-full p-1.5 transition-colors hover:bg-warm-100"
                    aria-label="Mon compte"
                  >
                    {session.user?.image ? (
                      <img
                        src={session.user.image}
                        alt={session.user.name || 'Utilisateur'}
                        className="h-9 w-9 rounded-full ring-2 ring-prairie-200 ring-offset-2"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-prairie-500 shadow">
                        <User className="h-4 w-4 text-warm-900" />
                      </div>
                    )}
                  </button>
                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        variants={submenuVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute right-0 top-full z-50 mt-2 min-w-[220px] overflow-hidden rounded-2xl border border-warm-200 bg-white py-2 shadow-2xl"
                      >
                        <div className="border-b border-warm-100 px-4 py-3">
                          <p className="truncate font-semibold text-warm-800">
                            {session.user?.companyName || session.user?.name}
                          </p>
                          <p className="truncate text-sm text-warm-500">{session.user?.email}</p>
                          {session.user?.role !== 'platform_admin' && (
                            <p className="mt-1 text-xs font-medium">
                              {isCustomer ? (
                                <span className="text-prairie-600">Compte particulier</span>
                              ) : isApproved ? (
                                <span className="text-prairie-600">Compte professionnel approuvé</span>
                              ) : (
                                <span className="text-amber-600">En attente de validation</span>
                              )}
                            </p>
                          )}
                        </div>
                        <Link
                          href="/suivi-commande"
                          className="flex items-center gap-3 px-4 py-3 text-sm text-warm-700 transition-colors hover:bg-prairie-50 hover:text-prairie-700"
                        >
                          <Package className="h-4 w-4" />
                          Mes commandes
                        </Link>
                        {session.user?.role === 'platform_admin' && (
                          <Link
                            href="/admin"
                            className="flex items-center gap-3 px-4 py-3 text-sm text-warm-700 transition-colors hover:bg-prairie-50 hover:text-prairie-700"
                          >
                            <Sparkles className="h-4 w-4" />
                            Dashboard Admin
                          </Link>
                        )}
                        <button
                          onClick={() => signOut()}
                          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 transition-colors hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Se déconnecter
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden items-center space-x-2 sm:flex">
                  <Link href="/connexion" className={ghostButton}>
                    Connexion
                  </Link>
                  <Link href="/inscription" className={primaryButton}>
                    Créer un compte
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Recherche (mobile / tablette) */}
          <AnimatePresence>
            {isSearchOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden xl:hidden"
              >
                <SearchForm
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSubmit={handleSearch}
                  inputClassName="rounded-lg py-3"
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Menu mobile */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.nav
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-4 max-h-[70vh] overflow-y-auto lg:hidden"
                aria-label="Navigation mobile"
              >
                <div className="flex flex-col space-y-2 border-b border-warm-200 pb-4">
                  {navigation.map((item) => (
                    <div key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-current={pathname === item.href ? 'page' : undefined}
                        className={cn(
                          'block rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                          pathname === item.href
                            ? 'bg-prairie-100 text-warm-900'
                            : 'text-warm-700 hover:bg-warm-50 hover:text-warm-900'
                        )}
                      >
                        {item.name}
                      </Link>
                      {item.submenu && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-prairie-100 pl-4">
                          {item.submenu.map((subitem) => {
                            const IconComponent = subitem.icon;
                            return (
                              <Link
                                key={subitem.name}
                                href={subitem.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-warm-600 transition-colors hover:bg-prairie-50 hover:text-prairie-700"
                              >
                                <IconComponent className={cn('h-4 w-4', subitem.color)} />
                                {subitem.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  <Link
                    href="/suivi-commande"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-warm-700 transition-colors hover:bg-warm-50 hover:text-warm-900"
                  >
                    <Package className="h-4 w-4 text-prairie-600" />
                    Suivi de commande
                  </Link>
                </div>

                {!session && (
                  <div className="flex flex-col space-y-3 pt-4 sm:hidden">
                    <Link
                      href="/connexion"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-warm-300 px-3 py-2.5 text-sm font-medium text-warm-800 transition-colors hover:bg-warm-50"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/inscription"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-prairie-500 px-3 py-2.5 text-sm font-medium text-warm-900 shadow transition-colors hover:bg-prairie-400"
                    >
                      Créer un compte
                    </Link>
                  </div>
                )}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Panier */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}

export default Header;
