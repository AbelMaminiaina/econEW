import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Product } from '@/types';
import { SERVER_API_BASE_URL } from '@/lib/api/config';
import { fetchSellerOnServer } from '@/lib/api/sellers';
import { PageHeader } from '@/components/electro/PageHeader';
import { memberSinceLabel } from '@/components/electro/SellerCard';
import ProductGrid from '@/components/electro/ProductGrid';
import { SellerOwnerLink } from './SellerOwnerLink';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchSellerProducts(id: string): Promise<Product[]> {
  try {
    const res = await fetch(`${SERVER_API_BASE_URL}/products?seller=${encodeURIComponent(id)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return ((await res.json()) as { products: Product[] }).products;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const seller = await fetchSellerOnServer(id);
  if (!seller) return { title: 'Vendeur introuvable' };
  return {
    title: `${seller.name} : boutique`,
    description: `Découvrez les ${seller.productCount} produits vendus en gros par ${seller.name}.`,
    alternates: { canonical: `/vendeurs/${id}` },
  };
}

// Profil public d'un vendeur : l'entreprise (et le responsable du compte) derrière les produits
export default async function SellerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [seller, products] = await Promise.all([fetchSellerOnServer(id), fetchSellerProducts(id)]);

  if (!seller) notFound();

  return (
    <>
      <PageHeader
        title={seller.name}
        crumbs={[{ label: 'Vendeurs', href: '/vendeurs' }, { label: seller.name }]}
      />

      <div className="container-fluid product py-5">
        <div className="container py-5">
          {/* Profil */}
          <div className="bg-light rounded p-4 p-md-5 mb-5">
            <div className="row g-4 align-items-center">
              <div className="col-md-auto text-center">
                <div
                  className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold"
                  style={{ width: 110, height: 110, fontSize: 44 }}
                  aria-hidden="true"
                >
                  {seller.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="col-md">
                <h1 className="display-6 mb-1">{seller.name}</h1>
                {seller.legalName && <p className="mb-2">{seller.legalName}</p>}
                <ul className="list-unstyled mb-0">
                  {seller.contactPerson && (
                    <li>
                      <i className="fas fa-user text-primary me-2"></i>
                      Responsable du compte : <strong className="text-dark">{seller.contactPerson}</strong>
                    </li>
                  )}
                  <li>
                    <i className="fas fa-calendar-alt text-primary me-2"></i>
                    Membre depuis {memberSinceLabel(seller.memberSince)}
                  </li>
                  <li>
                    <i className="fas fa-check-circle text-primary me-2"></i>
                    Entreprise vérifiée par notre équipe
                  </li>
                  <li>
                    <i className="fas fa-box text-primary me-2"></i>
                    {seller.productCount} produit{seller.productCount > 1 ? 's' : ''} en vente
                  </li>
                </ul>
              </div>
              <div className="col-md-auto text-center">
                <Link href="/contact" className="btn btn-primary rounded-pill py-3 px-4 mb-2 d-block">
                  <i className="fas fa-envelope me-2"></i>Nous contacter
                </Link>
                <SellerOwnerLink sellerId={seller.id} />
              </div>
            </div>
          </div>

          <h2 className="mb-4">Produits de {seller.name}</h2>
          <ProductGrid products={products} />
        </div>
      </div>
    </>
  );
}
