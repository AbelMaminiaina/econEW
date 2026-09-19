'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Mail,
  Clock,
  Facebook,
  Instagram,
  ChevronRight,
  ShieldCheck,
  ArrowUp,
} from 'lucide-react';

const footerLinks = {
  produits: [
    { name: 'Tous les produits', href: '/produits' },
    { name: 'Devenir client professionnel', href: '/inscription' },
  ],
  informations: [
    { name: 'Blog & Conseils', href: '/blog' },
    { name: 'Contact', href: '/contact' },
  ],
  services: [
    { name: 'Livraison', href: '/services#livraison' },
    { name: 'Paiement Mobile Money', href: '/services#paiement' },
  ],
  legal: [
    { name: 'Mentions légales', href: '/mentions-legales' },
    { name: 'Politique de confidentialité', href: '/politique-confidentialite' },
    { name: 'CGV', href: '/cgv' },
    { name: 'Politique de livraison', href: '/cgv#livraison' },
  ],
};

export function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement newsletter subscription
    setIsSubscribed(true);
    setEmail('');
  };

  const linkClass =
    'flex items-center py-0.5 text-warm-300 transition-all duration-500 hover:tracking-wide hover:text-electro-secondary';

  const columns = [
    { title: 'Nos produits', links: footerLinks.produits },
    { title: 'Informations', links: [...footerLinks.informations, ...footerLinks.services] },
    { title: 'Légal', links: footerLinks.legal },
  ];

  const infoCards = [
    {
      icon: MapPin,
      title: 'Adresse',
      content: <>LE 187<br />Ambohitsoa Ambavatonelina, Madagascar</>,
    },
    {
      icon: Mail,
      title: 'Écrivez-nous',
      content: (
        <a href="mailto:contact@all.mg" className="transition-colors hover:text-electro-secondary">
          contact@all.mg
        </a>
      ),
    },
    {
      icon: Clock,
      title: 'Horaires',
      content: <>Lun - Ven : 9h - 18h<br />Sam : 9h - 12h · Dim : fermé</>,
    },
    {
      icon: ShieldCheck,
      title: 'Paiement sécurisé',
      content: <>MVola, Orange Money et Airtel Money</>,
    },
  ];

  return (
    <footer>
      <div className="bg-electro-dark py-16 text-warm-300">
        <div className="container mx-auto px-4">
          {/* Cartes d'information */}
          <div className="mb-12 grid grid-cols-1 gap-4 rounded bg-white/[0.03] sm:grid-cols-2 xl:grid-cols-4">
            {infoCards.map(({ icon: Icon, title, content }) => (
              <div key={title} className="p-6">
                <div className="mb-4 flex h-[70px] w-[70px] items-center justify-center rounded-full bg-electro-secondary">
                  <Icon className="h-8 w-8 text-electro-primary" />
                </div>
                <h4 className="mb-2 text-xl font-medium text-white">{title}</h4>
                <p className="text-sm leading-7">{content}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-4">
            {/* Newsletter */}
            <div>
              <Link href="/" className="mb-4 inline-block">
                <span className="font-display text-3xl font-medium text-electro-primary">All</span>
              </Link>
              <h4 className="mb-3 text-xl font-medium text-electro-primary">Newsletter</h4>
              <p className="mb-4 text-sm leading-7">
                Recevez nos nouveautés catalogue, nos offres tarifaires et les actualités de la plateforme.
              </p>
              {isSubscribed ? (
                <p className="font-medium text-white">
                  Merci pour votre inscription ! Vous recevrez bientôt nos actualités.
                </p>
              ) : (
                <form onSubmit={handleNewsletterSubmit} className="relative">
                  <input
                    type="email"
                    placeholder="Votre adresse email"
                    aria-label="Votre adresse email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-full border-0 bg-white py-3 pl-5 pr-28 text-sm text-warm-800 placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-electro-primary"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1.5 rounded-full bg-electro-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-500 hover:bg-electro-secondary"
                  >
                    S&apos;inscrire
                  </button>
                </form>
              )}
            </div>

            {columns.map((column) => (
              <div key={column.title}>
                <h4 className="mb-4 text-xl font-medium text-electro-primary">{column.title}</h4>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <Link href={link.href} className={linkClass}>
                        <ChevronRight className="mr-2 h-4 w-4 shrink-0" />
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Copyright + attribution (obligatoire, cf. licence du template Electro) */}
      <div className="border-t border-white/10 bg-electro-primary py-4 text-white">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm md:flex-row">
          <span>
            &copy; {new Date().getFullYear()} All. Tous droits réservés.
          </span>
          <div className="flex items-center gap-3">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/20 p-2 transition-colors hover:bg-white/40"
              aria-label="Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/20 p-2 transition-colors hover:bg-white/40"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
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
        className="fixed bottom-6 right-6 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-electro-primary text-white shadow-lg transition-colors duration-500 hover:bg-electro-secondary"
      >
        <ArrowUp className="h-5 w-5" />
      </a>
    </footer>
  );
}

export default Footer;
