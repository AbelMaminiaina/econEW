'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CONTACT, CONTACT_ADDRESS_LINES } from '@/lib/contact';

const COLUMNS = [
  {
    title: 'Nos produits',
    links: [
      { name: 'Tous les produits', href: '/produits' },
      { name: 'Mes favoris', href: '/favoris' },
      { name: 'Devenir client professionnel', href: '/inscription' },
    ],
  },
  {
    title: 'Informations',
    links: [
      { name: 'Blog & Conseils', href: '/blog' },
      { name: 'Contact', href: '/contact' },
      { name: 'Livraison', href: '/services#livraison' },
      { name: 'Paiement Mobile Money', href: '/services#paiement' },
    ],
  },
  {
    title: 'Légal',
    links: [
      { name: 'Mentions légales', href: '/mentions-legales' },
      { name: 'Politique de confidentialité', href: '/politique-confidentialite' },
      { name: 'CGV', href: '/cgv' },
      { name: 'Politique de livraison', href: '/cgv#livraison' },
    ],
  },
];

const INFO_CARDS = [
  { icon: 'fa-map-marker-alt', title: 'Adresse', lines: [...CONTACT_ADDRESS_LINES] },
  { icon: 'fa-envelope', title: 'Écrivez-nous', lines: [CONTACT.email] },
  { icon: 'fa-clock', title: 'Horaires', lines: ['Lun - Ven : 9h - 18h', 'Sam : 9h - 12h · Dim : fermé'] },
  { icon: 'fa-mobile-alt', title: 'Paiement sécurisé', lines: ['MVola, Orange Money,', 'Airtel Money'] },
];

// Pied de page du template Electro : cartes d'infos, newsletter, liens, bandeau de copyright.
export function ElectroFooter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
    setSubscribed(true);
    setEmail('');
  };

  return (
    <>
      <div className="container-fluid footer py-5 wow fadeIn" data-wow-delay="0.2s">
        <div className="container py-5">
          <div className="row g-4 rounded mb-5" style={{ background: 'rgba(255, 255, 255, .03)' }}>
            {INFO_CARDS.map((card) => (
              <div key={card.title} className="col-md-6 col-lg-6 col-xl-3">
                <div className="rounded p-4">
                  <div
                    className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4"
                    style={{ width: 70, height: 70 }}
                  >
                    <i className={`fas ${card.icon} fa-2x text-primary`}></i>
                  </div>
                  <div>
                    <h4 className="text-white">{card.title}</h4>
                    {card.lines.map((line) => (
                      <p key={line} className="mb-2">{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-5">
            <div className="col-md-6 col-lg-6 col-xl-3">
              <div className="footer-item d-flex flex-column">
                <h4 className="text-primary mb-4">Newsletter</h4>
                <p className="mb-3">
                  Recevez nos nouveautés catalogue, nos offres tarifaires et les actualités de la plateforme.
                </p>
                {subscribed ? (
                  <p className="text-white">Merci pour votre inscription ! Vous recevrez bientôt nos actualités.</p>
                ) : (
                  <form onSubmit={handleSubmit} className="position-relative mx-auto rounded-pill w-100">
                    <input
                      className="form-control rounded-pill w-100 py-3 ps-4 pe-5"
                      type="email"
                      required
                      placeholder="Votre adresse email"
                      aria-label="Votre adresse email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary rounded-pill position-absolute top-0 end-0 py-2 mt-2 me-2">
                      S&apos;inscrire
                    </button>
                  </form>
                )}
              </div>
            </div>

            {COLUMNS.map((column) => (
              <div key={column.title} className="col-md-6 col-lg-6 col-xl-3">
                <div className="footer-item d-flex flex-column">
                  <h4 className="text-primary mb-4">{column.title}</h4>
                  {column.links.map((link) => (
                    <Link key={link.name} href={link.href}>
                      <i className="fas fa-angle-right me-2"></i> {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="container-fluid copyright py-4">
        <div className="container">
          <div className="text-center text-white">
            <i className="fas fa-copyright text-light me-2"></i>
            {new Date().getFullYear()} All, tous droits réservés.
          </div>
        </div>
      </div>

      {/* Retour en haut */}
      <a
        href="#top"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        aria-label="Retour en haut"
        className="btn btn-primary btn-lg-square back-to-top"
        style={{ display: showTop ? 'flex' : 'none' }}
      >
        <i className="fa fa-arrow-up"></i>
      </a>
    </>
  );
}

export default ElectroFooter;
