'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { FeaturedTabs } from './FeaturedProducts';
import ProductGrid from '../ProductGrid';

type TabId = keyof FeaturedTabs;

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'nouveautes', label: 'Nouveautés' },
  { id: 'populaires', label: 'À la une' },
];

// « Our Products » du template : titre à gauche, onglets en pilules à droite, grille de cartes.
export function FeaturedProductsClient({ tabs }: { tabs: FeaturedTabs }) {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  // Un onglet sans produit n'est pas affiché
  const visibleTabs = TAB_LABELS.filter((t) => t.id === 'all' || tabs[t.id].length > 0);

  return (
    <div className="container-fluid product py-5">
      <div className="container py-5">
        <div className="tab-class">
          <div className="row g-4">
            <div className="col-lg-4 text-start wow fadeInLeft" data-wow-delay="0.1s">
              <h1>Nos produits</h1>
              <p className="mb-0">
                Les produits les plus demandés : smartphones, ordinateurs, photo et accessoires, avec des tarifs dégressifs pour les professionnels.
              </p>
            </div>
            <div className="col-lg-8 text-end wow fadeInRight" data-wow-delay="0.1s">
              <ul className="nav nav-pills d-inline-flex text-center mb-5" role="tablist" aria-label="Filtrer les produits">
                {visibleTabs.map((tab) => (
                  <li key={tab.id} className="nav-item mb-4" role="presentation">
                    <a
                      href={`#tab-${tab.id}`}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      className={`d-flex mx-2 py-2 bg-light rounded-pill${activeTab === tab.id ? ' active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab(tab.id);
                      }}
                    >
                      <span className="text-dark" style={{ width: 130 }}>{tab.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="tab-content">
            <div key={activeTab} id={`tab-${activeTab}`} role="tabpanel" className="tab-pane fade show p-0 active">
              <ProductGrid products={tabs[activeTab]} />
            </div>
          </div>
          <div className="text-center mt-5">
            <Link href="/produits" className="btn btn-primary rounded-pill py-3 px-5">
              Voir tout le catalogue
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeaturedProductsClient;
