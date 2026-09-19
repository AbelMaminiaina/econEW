'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Eye, Truck, CalendarClock, Check } from 'lucide-react';
import { Product } from '@/types';
import { Badge, Button } from '@/components/ui';
import {
  cn,
  formatDate,
  formatPrice,
  formatQuantity,
  formatWeight,
  getBadgeLabel,
  isUpcoming,
  resolveUnitPrice,
} from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import { useToast } from '@/components/ui/Toast';

interface ProductCardProps {
  product: Product;
}

// Carte produit reprise du template Bloom : image carrée avec aperçu au survol, nom, prix,
// bouton pleine largeur. Les règles B2B (quantité minimum, paliers, accès) s'y ajoutent.
export function ProductCard({ product }: ProductCardProps) {
  const cart = useCart();
  const { addToast } = useToast();
  const { isApproved, canOrder } = useCompanyAccess();
  const [justAdded, setJustAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const upcoming = isUpcoming(product.availableFrom);
  const unavailable = !upcoming && !product.inStock;
  // MOQ pour tous (vente en gros). Paliers dégressifs : pros approuvés uniquement.
  const unitPrice = isApproved
    ? resolveUnitPrice(product.price, product.priceTiers, product.moq)
    : product.price;
  const bestTierPrice = product.priceTiers.length
    ? Math.min(product.price, ...product.priceTiers.map((t) => t.unitPrice))
    : null;
  const href = `/produits/${product.slug}`;

  const handleAddToCart = () => {
    cart.addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '/images/placeholder.jpg',
      slug: product.slug,
      metadata: product.metadata,
      freeShipping: product.freeShipping,
      estimatedWeightKg: product.estimatedWeightKg,
      availableFrom: product.availableFrom,
      moq: product.moq,
      unit: product.unit,
      priceTiers: product.priceTiers,
      quantity: product.moq,
    });

    addToast('success', upcoming ? `${product.name} réservé` : `${product.name} ajouté au panier`);

    setJustAdded(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:hover:translate-y-0">
      {/* Image */}
      <div className="relative overflow-hidden">
        <Link href={href} className="relative block">
          <div className="aspect-square overflow-hidden bg-warm-100">
            {!imageError ? (
              <Image
                src={product.images[0] || '/images/placeholder.jpg'}
                alt={product.name}
                width={400}
                height={400}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-warm-100 text-sm text-warm-500">
                Image indisponible
              </div>
            )}
          </div>

          {/* Aperçu au survol */}
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-lg bg-prairie-500 px-3 py-2 text-sm font-medium text-warm-900 shadow">
              <Eye className="h-4 w-4" />
              Voir le produit
            </span>
          </div>
        </Link>

        {/* Badges */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1">
          {product.badges.map((badge) => (
            <Badge key={badge} type={badge} size="sm">
              {getBadgeLabel(badge)}
            </Badge>
          ))}
        </div>

        {/* Rupture de stock (pas pour un produit en précommande) */}
        {unavailable && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-warm-900/60">
            <span className="rounded-lg bg-warm-800 px-4 py-2 font-semibold text-white">
              Rupture de stock
            </span>
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={href}>
          <h3 className="line-clamp-2 font-semibold text-warm-800 transition-colors hover:text-prairie-600">
            {product.name}
          </h3>
        </Link>

        <div>
          <span className="text-lg font-bold text-warm-800">{formatPrice(unitPrice)}</span>
          {product.originalPrice && (
            <span className="ml-2 text-sm text-warm-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
          <span className="block text-xs text-warm-500">
            /{product.unit}
            {bestTierPrice && bestTierPrice < product.price && (
              isApproved
                ? <> · à partir de {formatPrice(bestTierPrice)} en gros</>
                : <> · tarifs dégressifs pour les pros</>
            )}
          </span>
        </div>

        <div className="space-y-1 text-xs text-warm-500">
          <p>Quantité minimum&nbsp;: {formatQuantity(product.moq, product.unit)}</p>
          {product.estimatedWeightKg ? (
            <p>Poids estimé&nbsp;: {formatWeight(product.estimatedWeightKg)}</p>
          ) : null}
          {product.freeShipping && (
            <p className="inline-flex items-center gap-1 font-medium text-prairie-600">
              <Truck className="h-3.5 w-3.5" />
              Livraison offerte
            </p>
          )}
          {upcoming && (
            <p className="inline-flex items-center gap-1 font-medium text-amber-700">
              <CalendarClock className="h-3.5 w-3.5" />
              Disponible le {formatDate(product.availableFrom!)}
            </p>
          )}
        </div>

        {canOrder && (
          <div className="mt-auto">
            <Button
              fullWidth
              icon={justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
              onClick={handleAddToCart}
              disabled={unavailable}
              aria-label={unavailable ? 'Indisponible' : upcoming ? 'Réserver' : 'Ajouter au panier'}
              className={cn(justAdded && 'bg-green-600 text-white hover:bg-green-600')}
            >
              {unavailable
                ? 'Indisponible'
                : justAdded
                  ? upcoming ? 'Réservé !' : 'Ajouté !'
                  : upcoming ? 'Réserver' : 'Ajouter au panier'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductCard;
