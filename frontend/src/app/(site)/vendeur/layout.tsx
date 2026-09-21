'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';

const tabs = [
  { name: 'Mes produits', href: '/vendeur' },
  { name: 'Commandes reçues', href: '/vendeur/commandes' },
  { name: 'Mes gains', href: '/vendeur/reversements' },
  { name: 'Publier un produit', href: '/vendeur/produits/nouveau' },
];

// Espace vendeur : réservé aux comptes d'une entreprise approuvée.
export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useCompanyAccess();

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/connexion?callbackUrl=/vendeur');
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-prairie-600" />
      </div>
    );
  }

  if (status !== 'approved') {
    const message =
      status === 'pending'
        ? 'Votre compte entreprise est en attente de validation. Vous pourrez publier des produits dès son approbation.'
        : status === 'customer'
          ? 'L’espace vendeur est réservé aux entreprises. Créez un compte professionnel pour publier vos produits.'
          : status === 'platform_admin'
            ? 'Les administrateurs valident les produits depuis le tableau de bord admin.'
            : 'Votre compte entreprise ne permet pas de publier des produits pour le moment.';
    return (
      <div className="container mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="mb-4 text-2xl font-semibold text-warm-800">Espace vendeur</h1>
        <p className="mb-8 text-warm-600">{message}</p>
        <Link
          href={status === 'platform_admin' ? '/admin/produits' : status === 'customer' ? '/inscription' : '/'}
          className="inline-block rounded-full bg-prairie-500 px-8 py-3 text-white"
        >
          {status === 'platform_admin' ? 'Produits à valider' : status === 'customer' ? 'Créer un compte pro' : "Retour à l'accueil"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-warm-800">Espace vendeur</h1>
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Espace vendeur">
          {tabs.map((tab) => {
            const active = tab.href === '/vendeur' ? pathname === '/vendeur' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-prairie-600 text-white' : 'bg-white text-warm-600 hover:bg-warm-100'
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
        {children}
      </div>
    </div>
  );
}
