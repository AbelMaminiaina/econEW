import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/electro/PageHeader';
import { SellerCard } from '@/components/electro/SellerCard';
import { fetchSellersOnServer } from '@/lib/api/sellers';

// Le backend n'est pas joignable pendant le build Docker isolé : rendu à chaque requête
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nos vendeurs',
  description:
    'Les entreprises qui publient leurs produits en gros sur la plateforme : découvrez leurs boutiques.',
  alternates: { canonical: '/vendeurs' },
};

// Annuaire des entreprises vendeuses (comptes professionnels approuvés ayant des produits publiés)
export default async function SellersPage() {
  const sellers = await fetchSellersOnServer();

  return (
    <>
      <PageHeader
        title="Nos vendeurs"
        crumbs={[{ label: 'Vendeurs' }]}
        description="Des entreprises approuvées par notre équipe, qui publient leurs produits en gros."
      />

      <div className="container-fluid py-5">
        <div className="container py-5">
          {sellers.length === 0 ? (
            <div className="text-center mx-auto" style={{ maxWidth: 560 }}>
              <i className="fas fa-store display-1 text-secondary mb-4 d-block"></i>
              <h2 className="mb-3">Aucun vendeur pour le moment</h2>
              <p className="mb-4">
                Vous êtes une entreprise ? Créez un compte professionnel et publiez vos produits en gros.
              </p>
              <Link href="/inscription" className="btn btn-primary rounded-pill py-3 px-5">
                Devenir vendeur
              </Link>
            </div>
          ) : (
            <>
              <div className="row g-4">
                {sellers.map((seller) => (
                  <div key={seller.id} className="col-md-6 col-xl-4">
                    <SellerCard seller={seller} />
                  </div>
                ))}
              </div>
              <div className="text-center mt-5">
                <p className="mb-3">Vous êtes une entreprise et vous vendez en gros ?</p>
                <Link href="/inscription" className="btn btn-secondary rounded-pill py-3 px-5">
                  Publier mes produits
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
