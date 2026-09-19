import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Product } from '@/types';
import ProductDetailClient from './ProductDetailClient';

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/hooks/useCompanyAccess', () => ({
  useCompanyAccess: () => ({ isApproved: true, canOrder: true }),
}));

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Carton emballage',
    slug: 'carton-emballage',
    category: 'emballage',
    description: 'desc',
    shortDescription: 'short',
    price: 30000,
    images: ['/img.jpg'],
    inStock: true,
    badges: [],
    moq: 1,
    unit: 'piece',
    priceTiers: [],
    freeShipping: false,
    estimatedWeightKg: null,
    availableFrom: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

describe('ProductDetailClient — bloc « Livraison gratuite »', () => {
  it('affiche « Dès 200 000 Ar d’achat » pour un produit sans livraison offerte', () => {
    render(<ProductDetailClient product={makeProduct({ freeShipping: false })} relatedProducts={[]} />);
    expect(screen.getByText(/Dès 200 000 Ar d’achat/)).toBeInTheDocument();
    expect(screen.queryByText('Incluse pour ce produit')).not.toBeInTheDocument();
  });

  it('remplace la condition par « Incluse pour ce produit » quand le produit est en livraison offerte', () => {
    render(<ProductDetailClient product={makeProduct({ freeShipping: true })} relatedProducts={[]} />);
    expect(screen.getByText('Incluse pour ce produit')).toBeInTheDocument();
    expect(screen.queryByText(/Dès 200 000 Ar d’achat/)).not.toBeInTheDocument();
  });
});

describe('ProductDetailClient — précommande', () => {
  const future = new Date(Date.now() + 30 * 86400_000).toISOString();

  it('montre la date de dispo et le bouton « Réserver » avant la date, sans « Rupture de stock »', () => {
    render(
      <ProductDetailClient
        product={makeProduct({ availableFrom: future, inStock: false })}
        relatedProducts={[]}
      />
    );
    expect(screen.getByRole('button', { name: /Réserver/ })).toBeInTheDocument();
    expect(screen.getByText(/réservation possible dès maintenant/)).toBeInTheDocument();
    expect(screen.queryByText('Rupture de stock')).not.toBeInTheDocument();
    expect(screen.queryByText('Bientôt disponible')).not.toBeInTheDocument();
  });
});
