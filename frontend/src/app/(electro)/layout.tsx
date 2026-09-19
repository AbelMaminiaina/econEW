import { siteMetadata } from '@/lib/site-metadata';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { ToastProvider } from '@/components/electro/Toast';
import { ElectroHeader } from '@/components/electro/Header';
import { ElectroFooter } from '@/components/electro/Footer';
import { ElectroEffects } from '@/components/electro/Effects';
import { OrganizationJsonLd, LocalBusinessJsonLd, WebsiteJsonLd } from '@/components/seo/JsonLd';

export const metadata = siteMetadata;

// Layout racine des pages Electro : Bootstrap 5 + style.css du template (aucun Tailwind ici).
// Deux layouts racine distincts ((site) et (electro)) => la navigation entre les deux groupes
// recharge la page, ce qui évite tout mélange entre les CSS Bootstrap et Tailwind.
export default function ElectroLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/electro/fontawesome/css/all.min.css" />
        <link rel="stylesheet" href="/electro/bootstrap-icons/bootstrap-icons.css" />
        <link rel="stylesheet" href="/electro/lib/animate/animate.min.css" />
        <link rel="stylesheet" href="/electro/lib/owlcarousel/assets/owl.carousel.min.css" />
        <link rel="stylesheet" href="/electro/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/electro/css/style.css" />
        <link rel="stylesheet" href="/electro/css/electro-extra.css" />
        <OrganizationJsonLd />
        <LocalBusinessJsonLd />
        <WebsiteJsonLd />
      </head>
      <body suppressHydrationWarning>
        <SessionProvider>
          <ToastProvider>
            <ElectroHeader />
            <main>{children}</main>
            <ElectroFooter />
            <ElectroEffects />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
