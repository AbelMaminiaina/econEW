import Script from 'next/script';

// Organisation / Entreprise
export function OrganizationJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'All',
    alternateName: 'All B2B',
    url: 'https://all.mg',
    logo: 'https://all.mg/icon.svg',
    description:
      'All est une plateforme de vente en gros pour professionnels à Madagascar : tarifs dégressifs, paiement par Mobile Money, livraison à Antananarivo.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'LE 187',
      addressLocality: 'Ambohitsoa Ambavatonelina',
      addressRegion: 'Analamanga',
      addressCountry: 'MG',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'contact@all.mg',
      contactType: 'customer service',
      availableLanguage: ['French', 'Malagasy'],
    },
    sameAs: [
      'https://www.facebook.com/all.mg',
      'https://www.instagram.com/all.mg',
    ],
  };

  return (
    <Script
      id="organization-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Entreprise locale
export function LocalBusinessJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': 'https://all.mg/#localbusiness',
    name: 'All',
    image: 'https://all.mg/icon.svg',
    description:
      'Plateforme de vente en gros pour professionnels à Madagascar : catalogue multi-catégories, tarifs dégressifs par quantité, paiement par Mobile Money.',
    url: 'https://all.mg',
    email: 'contact@all.mg',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'LE 187',
      addressLocality: 'Ambohitsoa Ambavatonelina',
      addressRegion: 'Analamanga',
      postalCode: '103',
      addressCountry: 'MG',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -18.8792,
      longitude: 47.5079,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '17:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Saturday',
        opens: '08:00',
        closes: '12:00',
      },
    ],
    priceRange: '$$',
    currenciesAccepted: 'MGA',
    paymentAccepted: 'MVola, Orange Money, Airtel Money',
  };

  return (
    <Script
      id="localbusiness-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Produit
interface ProductJsonLdProps {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  sku?: string;
  slug: string;
}

export function ProductJsonLd({
  name,
  description,
  image,
  price,
  currency = 'MGA',
  availability = 'InStock',
  sku,
  slug,
}: ProductJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: image.startsWith('http')
      ? image
      : `https://all.mg${image}`,
    url: `https://all.mg/produits/${slug}`,
    sku: sku || slug,
    brand: {
      '@type': 'Brand',
      name: 'All',
    },
    offers: {
      '@type': 'Offer',
      price: price,
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      seller: {
        '@type': 'Organization',
        name: 'All',
      },
    },
  };

  return (
    <Script
      id={`product-jsonld-${slug}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Fil d'Ariane (Breadcrumb)
interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// FAQ
interface FAQItem {
  question: string;
  answer: string;
}

export function FAQJsonLd({ items }: { items: FAQItem[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <Script
      id="faq-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// WebSite avec SearchAction
export function WebsiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'All',
    url: 'https://all.mg',
    description:
      'Plateforme de vente en gros pour professionnels à Madagascar - tarifs dégressifs, paiement par Mobile Money.',
    inLanguage: 'fr-MG',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://all.mg/produits?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Script
      id="website-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
