import React from 'react';

const VALUES = [
  {
    icon: 'fa-boxes',
    title: 'Vente en gros pour tous',
    description:
      "Particuliers et professionnels achètent en gros volume : la quantité minimum de chaque produit (10 pièces au moins) est indiquée sur sa fiche. Pas de vente au détail.",
  },
  {
    icon: 'fa-percent',
    title: 'Tarifs dégressifs',
    description:
      "Pour les comptes professionnels approuvés, plus vous commandez, moins vous payez à l'unité. Les paliers de prix sont affichés de manière transparente.",
  },
  {
    icon: 'fa-mobile-alt',
    title: 'Paiement Mobile Money',
    description:
      'Payez en ligne par MVola, Orange Money ou Airtel Money, avec ou sans compte. Votre commande est traitée dès que votre paiement est confirmé.',
  },
  {
    icon: 'fa-truck',
    title: 'Livraison fiable',
    description:
      'Livraison à Antananarivo et environs, ou retrait sur place. Suivi de commande dans votre espace client.',
  },
];

// Arguments de la plateforme, en cartes bordées au style du template.
export function Values() {
  return (
    <div className="container-fluid bg-light py-5">
      <div className="container py-5">
        <div className="text-center mx-auto mb-5 wow fadeInUp" data-wow-delay="0.1s" style={{ maxWidth: 720 }}>
          <p className="text-primary fw-bold mb-2">Pourquoi All</p>
          <h1 className="display-6">Ce qui fait la différence</h1>
          <p className="mb-0">
            Une plateforme pensée pour l&apos;achat en gros : quantités claires, prix transparents, paiement adapté
            et livraison fiable.
          </p>
        </div>
        <div className="row g-4">
          {VALUES.map((value, i) => (
            <div key={value.title} className="col-md-6 col-xl-3 wow fadeInUp" data-wow-delay={`${0.1 + i * 0.1}s`}>
              <div className="border rounded bg-white p-4 h-100 text-center">
                <div
                  className="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center mb-4"
                  style={{ width: 70, height: 70 }}
                >
                  <i className={`fas ${value.icon} fa-2x text-white`}></i>
                </div>
                <h4 className="mb-3">{value.title}</h4>
                <p className="mb-0">{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Values;
