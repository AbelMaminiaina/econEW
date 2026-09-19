import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import {
  OrganizationJsonLd,
  LocalBusinessJsonLd,
  WebsiteJsonLd,
} from '@/components/seo/JsonLd';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'All - Plateforme de vente en gros pour professionnels à Madagascar',
    template: '%s | All',
  },
  icons: {
    icon: '/images/logo.png',
    shortcut: '/images/logo.png',
    apple: '/images/logo.png',
  },
  description:
    'All est une plateforme B2B de vente en gros à Madagascar : tarifs dégressifs par quantité, facturation à 30/60 jours pour les entreprises approuvées, livraison à Antananarivo. Ouvert aux particuliers.',
  keywords: [
    'all',
    'grossiste madagascar',
    'vente en gros madagascar',
    'plateforme b2b madagascar',
    'achat professionnel antananarivo',
    'tarifs dégressifs',
    'facturation entreprise',
    'paiement différé net 30',
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
      'Tarifs dégressifs par quantité, facturation à 30/60 jours, livraison à Antananarivo. Réservé aux entreprises approuvées.',
    images: [
      {
        url: '/images/logo.png',
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
      'Tarifs dégressifs par quantité, facturation à 30/60 jours, livraison à Antananarivo.',
    images: ['/images/logo.png'],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable} suppressHydrationWarning>
      <head>
        <OrganizationJsonLd />
        <LocalBusinessJsonLd />
        <WebsiteJsonLd />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <SessionProvider>
          <ToastProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
