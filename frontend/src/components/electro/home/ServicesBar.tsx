import React from 'react';

const SERVICES = [
  { icon: 'fa-percent', title: 'Tarifs dégressifs', text: 'Plus vous commandez, moins vous payez' },
  { icon: 'fa-truck', title: 'Livraison', text: 'Livraison à Antananarivo' },
  { icon: 'fa-mobile-alt', title: 'Paiement Mobile Money', text: 'MVola, Orange Money, Airtel Money' },
  { icon: 'fa-shield-alt', title: 'Comptes vérifiés', text: 'Professionnels validés par nos équipes' },
  { icon: 'fa-store', title: 'Vendez en gros', text: 'Les entreprises publient leurs produits' },
  { icon: 'fa-life-ring', title: 'Support', text: 'Une équipe à votre écoute' },
];

// Bandeau « Services » du template : six colonnes avec séparateurs verticaux.
export function ServicesBar() {
  return (
    <div className="container-fluid px-0">
      <div className="row g-0">
        {SERVICES.map((service, i) => (
          <div
            key={service.title}
            className={`col-6 col-md-4 col-lg-2 ${i === 0 ? 'border-start ' : ''}border-end wow fadeInUp`}
            data-wow-delay={`${0.1 * (i + 1)}s`}
          >
            <div className="p-4">
              <div className="d-flex align-items-center">
                <i className={`fas ${service.icon} fa-2x text-primary`}></i>
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">{service.title}</h6>
                  <p className="mb-0">{service.text}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServicesBar;
