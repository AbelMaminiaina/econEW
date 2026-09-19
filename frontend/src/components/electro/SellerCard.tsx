import React from 'react';
import Link from 'next/link';
import type { PublicSeller } from '@/lib/api/sellers';

export const memberSinceLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

// Carte d'un vendeur (annuaire) : pastille avec l'initiale, nom, responsable, ancienneté, nombre de produits.
export function SellerCard({ seller }: { seller: PublicSeller }) {
  return (
    <div className="border rounded p-4 h-100 text-center">
      <div
        className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3 fw-bold"
        style={{ width: 80, height: 80, fontSize: 32 }}
        aria-hidden="true"
      >
        {seller.name.charAt(0).toUpperCase()}
      </div>
      <h4 className="mb-1">
        <Link href={`/vendeurs/${seller.id}`} className="text-dark">
          {seller.name}
        </Link>
      </h4>
      {seller.legalName && <small className="d-block mb-2">{seller.legalName}</small>}
      <ul className="list-unstyled small mb-3">
        {seller.contactPerson && (
          <li>
            <i className="fas fa-user text-primary me-2"></i>Responsable : {seller.contactPerson}
          </li>
        )}
        <li>
          <i className="fas fa-calendar-alt text-primary me-2"></i>Membre depuis {memberSinceLabel(seller.memberSince)}
        </li>
        <li>
          <i className="fas fa-box text-primary me-2"></i>
          {seller.productCount} produit{seller.productCount > 1 ? 's' : ''} en vente
        </li>
      </ul>
      <Link href={`/vendeurs/${seller.id}`} className="btn btn-primary rounded-pill py-2 px-4">
        Voir la boutique
      </Link>
    </div>
  );
}

export default SellerCard;
