import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { SERVER_API_BASE_URL } from '@/lib/api/config';
import ProductDetailClient from './ProductDetailClient';
import { ProductJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

// The backend already caches these in Redis (see CACHE_TTL.PRODUCT/RELATED).
// We deliberately do NOT use Next.js' data cache here: product payloads embed
// their images (data: URIs) and can exceed Next's hard 2 MB fetch-cache limit,
// which silently drops the oversized part of the response. `no-store` streams
// the full payload straight through on every request.
async function getProduct(slug: string) {
  const res = await fetch(`${SERVER_API_BASE_URL}/products/${slug}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

async function getRelatedProducts(slug: string) {
  try {
    const res = await fetch(`${SERVER_API_BASE_URL}/products/${slug}/related?limit=4`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return [];
    }
    return res.json();
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Génération dynamique des métadonnées SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: 'Produit non trouvé',
      description: 'Ce produit n\'existe pas ou n\'est plus disponible.',
    };
  }

  const imageUrl = product.images?.[0]?.startsWith('http')
    ? product.images[0]
    : `https://all.mg${product.images?.[0] || '/images/logo.png'}`;

  return {
    title: product.name,
    description: product.shortDescription || product.description?.slice(0, 160),
    keywords: [
      product.name,
      product.category,
      'all',
      'madagascar',
      'vente en gros',
      'livraison antananarivo',
    ],
    openGraph: {
      title: `${product.name} | All`,
      description: product.shortDescription || product.description?.slice(0, 160),
      url: `https://all.mg/produits/${slug}`,
      siteName: 'All',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 600,
          alt: product.name,
        },
      ],
      locale: 'fr_MG',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | All`,
      description: product.shortDescription || product.description?.slice(0, 160),
      images: [imageUrl],
    },
    alternates: {
      canonical: `/produits/${slug}`,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const [product, relatedProducts] = await Promise.all([
    getProduct(slug),
    getRelatedProducts(slug),
  ]);

  if (!product) {
    notFound();
  }

  const breadcrumbItems = [
    { name: 'Accueil', url: 'https://all.mg' },
    { name: 'Produits', url: 'https://all.mg/produits' },
    { name: product.name, url: `https://all.mg/produits/${slug}` },
  ];

  return (
    <>
      <ProductJsonLd
        name={product.name}
        description={product.description}
        image={product.images?.[0] || '/images/logo.png'}
        price={product.price}
        availability={product.inStock ? 'InStock' : 'OutOfStock'}
        slug={slug}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <ProductDetailClient
        product={product}
        relatedProducts={relatedProducts}
      />
    </>
  );
}
