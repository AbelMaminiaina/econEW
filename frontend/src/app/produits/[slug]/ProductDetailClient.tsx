'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Minus,
  Plus,
  Check,
  Truck,
  Shield,
  ArrowLeft,
  ChevronRight,
  CalendarClock,
} from 'lucide-react';
import { Product } from '@/types';
import { Button, Badge } from '@/components/ui';
import ProductGrid from '@/components/products/ProductGrid';
import { formatDate, formatPrice, formatQuantity, formatWeight, getBadgeLabel, getCategoryLabel, isUpcoming, resolveUnitPrice } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import { useToast } from '@/components/ui/Toast';
import { fadeInLeft, fadeInRight } from '@/lib/animations';

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
}

export default function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const { isApproved, canOrder } = useCompanyAccess();
  // MOQ pour tous (vente en gros). Paliers dégressifs : pros approuvés uniquement.
  const minQty = product.moq;
  const [customQty, setQuantity] = useState<number | null>(null);
  const quantity = Math.max(minQty, customQty ?? minQty);
  const [selectedImage, setSelectedImage] = useState(0);
  const cart = useCart();
  const { addToast } = useToast();

  const upcoming = isUpcoming(product.availableFrom);
  const reserveLabel = upcoming;
  const unitPrice = isApproved
    ? resolveUnitPrice(product.price, product.priceTiers, quantity)
    : product.price;

  const handleAddToCart = () => {
    cart.addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.images[0] || '/images/placeholder.jpg',
      slug: product.slug,
      metadata: product.metadata,
      freeShipping: product.freeShipping,
      estimatedWeightKg: product.estimatedWeightKg,
      availableFrom: product.availableFrom,
      moq: product.moq,
      unit: product.unit,
      priceTiers: product.priceTiers,
    });
    addToast('success', upcoming ? `${product.name} réservé` : `${product.name} ajouté au panier`);
  };

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-warm-500 mb-8">
          <Link href="/" className="hover:text-prairie-600">
            Accueil
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/produits" className="hover:text-prairie-600">
            Produits
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/produits?categorie=${product.category}`}
            className="hover:text-prairie-600"
          >
            {getCategoryLabel(product.category)}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-warm-700">{product.name}</span>
        </nav>

        {/* Product details */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Images */}
          <motion.div
            variants={fadeInLeft}
            initial="initial"
            animate="animate"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-warm-100 shadow-lg mb-4 p-6">
              <Image
                src={product.images[selectedImage] || '/images/placeholder.jpg'}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain"
                priority
              />
              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {product.badges.map((badge) => (
                  <Badge key={badge} type={badge}>
                    {getBadgeLabel(badge)}
                  </Badge>
                ))}
              </div>
            </div>
            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index
                        ? 'border-prairie-600 shadow-md'
                        : 'border-transparent hover:border-warm-300'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} - Image ${index + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div
            variants={fadeInRight}
            initial="initial"
            animate="animate"
          >
            {/* Category */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-prairie-600 font-medium">
                {getCategoryLabel(product.category)}
              </span>
            </div>

            {/* Name */}
            <h1 className="text-3xl md:text-4xl font-display font-bold text-warm-800 mb-4">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-prairie-600">
                {formatPrice(unitPrice)}
              </span>
              {product.originalPrice && (
                <span className="text-xl text-warm-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
              <span className="text-warm-500">/{product.unit}</span>
            </div>

            <p className="text-sm text-warm-600 mb-4">
              Quantité minimum de commande&nbsp;: <span className="font-medium">{formatQuantity(product.moq, product.unit)}</span>
            </p>

            {isApproved ? (
              <>

                {/* Tarifs dégressifs */}
                {product.priceTiers.length > 0 && (
                  <div className="mb-6 bg-warm-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-warm-800 mb-2">Tarifs par quantité</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="text-warm-600">
                          <td className="py-1">À partir de {formatQuantity(product.moq, product.unit)}</td>
                          <td className="py-1 text-right font-medium text-warm-800">{formatPrice(product.price)}</td>
                        </tr>
                        {product.priceTiers
                          .slice()
                          .sort((a, b) => a.minQty - b.minQty)
                          .map((tier) => (
                            <tr key={tier.minQty} className="text-warm-600">
                              <td className="py-1">À partir de {formatQuantity(tier.minQty, product.unit)}</td>
                              <td className="py-1 text-right font-medium text-warm-800">{formatPrice(tier.unitPrice)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              product.priceTiers.length > 0 && (
                <div className="mb-6 p-4 bg-warm-50 rounded-lg text-warm-700 text-sm">
                  Tarifs dégressifs et facturation différée réservés aux comptes professionnels.{' '}
                  <Link href="/inscription?type=professionnel" className="text-prairie-600 hover:underline font-medium">
                    Créer un compte professionnel
                  </Link>
                </div>
              )
            )}

            {/* Weight estimate + free shipping + availability */}
            {(product.estimatedWeightKg || product.freeShipping || upcoming) && (
              <div className="flex flex-col gap-2 mb-6">
                {upcoming && (
                  <p className="inline-flex items-center gap-2 text-sm text-amber-600 font-medium">
                    <CalendarClock className="h-4 w-4" />
                    Disponible à partir du {formatDate(product.availableFrom!)} — réservation possible dès maintenant
                  </p>
                )}
                {product.estimatedWeightKg ? (
                  <p className="text-sm text-warm-600">
                    <span className="font-medium">Poids estimé&nbsp;:</span>{' '}
                    {formatWeight(product.estimatedWeightKg)}
                  </p>
                ) : null}
                {product.freeShipping && (
                  <p className="inline-flex items-center gap-2 text-sm text-prairie-600 font-medium">
                    <Truck className="h-4 w-4" />
                    Livraison offerte
                  </p>
                )}
              </div>
            )}

            {/* Stock status (masqué pour un produit en précommande : l'info de date est affichée au-dessus) */}
            {!upcoming && (
              <div className="flex items-center gap-2 mb-6">
                {product.inStock ? (
                  <>
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-green-600 font-medium">En stock</span>
                    {product.stockQuantity && product.stockQuantity < 10 && (
                      <span className="text-warm-500">
                        (Plus que {product.stockQuantity} disponibles)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-red-600 font-medium">Rupture de stock</span>
                )}
              </div>
            )}

            {/* Description */}
            <p className="text-warm-600 leading-relaxed mb-6">
              {product.description}
            </p>

            {/* Characteristics */}
            {product.characteristics && (
              <div className="mb-8">
                <h3 className="font-semibold text-warm-800 mb-3">Caractéristiques</h3>
                <ul className="space-y-2">
                  {product.characteristics.map((char, index) => (
                    <li key={index} className="flex items-start gap-2 text-warm-600">
                      <Check className="h-5 w-5 text-prairie-500 shrink-0 mt-0.5" />
                      {char}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Add to cart */}
            {canOrder && (product.inStock || upcoming) && (
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                {/* Quantity selector */}
                <div className="flex items-center border border-warm-300 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(minQty, quantity - 1))}
                    className="p-3 hover:bg-warm-100 transition-colors"
                    aria-label="Diminuer la quantité"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-3 hover:bg-warm-100 transition-colors"
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                {/* Add to cart button */}
                <Button
                  size="lg"
                  onClick={handleAddToCart}
                  icon={<ShoppingCart className="h-5 w-5" />}
                  className="flex-1"
                >
                  {reserveLabel ? 'Réserver' : 'Ajouter au panier'}
                </Button>
              </div>
            )}

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-warm-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-prairie-50 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-prairie-600" />
                </div>
                <div>
                  <div className="font-medium text-warm-800 text-sm">
                    Livraison gratuite
                  </div>
                  <div className="text-xs text-warm-500">
                    {product.freeShipping ? 'Incluse pour ce produit' : 'Dès 200 000 Ar d’achat'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-prairie-50 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-prairie-600" />
                </div>
                <div>
                  <div className="font-medium text-warm-800 text-sm">
                    Qualité garantie
                  </div>
                  <div className="text-xs text-warm-500">Fraîcheur assurée</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-display font-bold text-warm-800 mb-6">
              Produits similaires
            </h2>
            <ProductGrid products={relatedProducts} />
          </section>
        )}

        {/* Back link */}
        <div className="mt-12">
          <Link href="/produits">
            <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />}>
              Retour aux produits
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
