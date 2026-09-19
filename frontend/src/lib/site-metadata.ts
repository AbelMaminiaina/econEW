import type { Metadata } from 'next';

// Métadonnées communes aux deux layouts racine ((site) en Tailwind, (electro) en Bootstrap).
export const siteMetadata: Metadata = {
  title: {
    default: 'All - Plateforme de vente en gros pour professionnels à Madagascar',
    template: '%s | All',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  description:
    'All est une plateforme B2B de vente en gros à Madagascar : tarifs dégressifs par quantité, paiement par Mobile Money, livraison à Antananarivo. Ouvert aux particuliers.',
  keywords: [
    'all',
    'grossiste madagascar',
    'vente en gros madagascar',
    'plateforme b2b madagascar',
    'achat professionnel antananarivo',
    'tarifs dégressifs',
    'paiement mobile money',
    'mvola orange money airtel money',
    'fournisseur grossiste',
    'livraison professionnelle antananarivo',
    'compte professionnel',
  ],
  authors: [{ name: 'All' }],
  creator: 'All',
  publisher: 'All',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://all.mg'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_MG',
    url: 'https://all.mg',
    siteName: 'All',
    title: 'All - Plateforme de vente en gros pour professionnels',
    description:
      'Tarifs dégressifs par quantité, paiement par Mobile Money, livraison à Antananarivo.',
    images: [
      {
        url: '/electro/img/carousel-1.jpg',
        width: 1200,
        height: 630,
        alt: 'All - Plateforme de vente en gros pour professionnels',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All - Plateforme de vente en gros pour professionnels',
    description:
      'Tarifs dégressifs par quantité, paiement par Mobile Money, livraison à Antananarivo.',
    images: ['/electro/img/carousel-1.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};
