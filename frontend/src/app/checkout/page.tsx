'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  MapPin,
  Truck,
  FileText,
  ChevronRight,
  ChevronLeft,
  Store,
  Check,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import { formatDeliveryWindow, formatPrice, formatQuantity, getShippingCost, isUpcoming, resolveUnitPrice } from '@/lib/utils';
import { Button, Input } from '@/components/ui';
import { createOrder } from '@/lib/api/checkout';
import { fadeInUp } from '@/lib/animations';
import { filterCheckoutSteps } from './checkout-steps';

type Step = 'adresse' | 'livraison' | 'confirmation';
type DeliveryMethod = 'standard' | 'express' | 'retrait';

interface AddressInfo {
  street: string;
  city: string;
  postalCode: string;
}

const paymentTermsLabels: Record<string, string> = {
  net_30: 'Net 30 jours',
  net_60: 'Net 60 jours',
};

const ALL_STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'adresse', label: 'Adresse', icon: <MapPin className="h-5 w-5" /> },
  { id: 'livraison', label: 'Livraison', icon: <Truck className="h-5 w-5" /> },
  { id: 'confirmation', label: 'Confirmation', icon: <FileText className="h-5 w-5" /> },
];

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const { status, isApproved, isCustomer, canOrder, session, accessToken } = useCompanyAccess();
  const [currentStep, setCurrentStep] = useState<Step>('adresse');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addressInfo, setAddressInfo] = useState<AddressInfo>({
    street: '',
    city: '',
    postalCode: '',
  });
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('standard');
  const [notes, setNotes] = useState('');

  // Redirige vers la connexion si non authentifié
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/connexion?callbackUrl=/checkout');
    }
  }, [status, router]);

  const unitPrice = (item: (typeof cart.items)[number]) =>
    isApproved ? resolveUnitPrice(item.price, item.priceTiers, item.quantity) : item.price;

  // Calculations
  const subtotal = cart.items.reduce((sum, item) => sum + unitPrice(item) * item.quantity, 0);
  const hasFreeShippingItem = cart.items.some((item) => item.freeShipping);
  const shippingCost = getShippingCost(deliveryMethod, subtotal, hasFreeShippingItem);
  const total = subtotal + shippingCost;

  const belowMoqItems = cart.items.filter((item) => item.quantity < item.moq);

  const steps = useMemo(
    () => filterCheckoutSteps(ALL_STEPS, hasFreeShippingItem),
    [hasFreeShippingItem]
  );

  useEffect(() => {
    if (!steps.some((s) => s.id === currentStep)) {
      setCurrentStep('confirmation');
    }
  }, [steps, currentStep]);

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 'adresse':
        if (deliveryMethod === 'retrait') return true;
        return !!(addressInfo.street && addressInfo.city);
      case 'livraison':
        return !!deliveryMethod;
      case 'confirmation':
        return belowMoqItems.length === 0;
      default:
        return false;
    }
  };

  const handleSubmitOrder = async () => {
    if (!validateCurrentStep() || !accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await createOrder(
        {
          items: cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          ...(deliveryMethod !== 'retrait'
            ? {
                shippingAddress: {
                  street: addressInfo.street,
                  city: addressInfo.city,
                  postalCode: addressInfo.postalCode,
                },
              }
            : {}),
          deliveryMethod,
          notes: notes || undefined,
        },
        accessToken
      );

      if (response.success && response.orderNumber) {
        cart.clearCart();
        router.push(
          `/checkout/confirmation?order=${response.orderNumber}&invoice=${response.invoiceNumber || ''}`
        );
      } else {
        setError(response.message || 'Une erreur est survenue');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création de la commande. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-prairie-600"></div>
      </div>
    );
  }

  if (!canOrder) {
    return (
      <div className="min-h-screen bg-cream-50 py-12">
        <div className="container mx-auto px-4 text-center py-20 max-w-md mx-auto">
          <h1 className="text-2xl font-display font-bold text-warm-800 mb-4">
            Compte en attente de validation
          </h1>
          <p className="text-warm-600 mb-8">
            Votre compte professionnel doit être approuvé par notre équipe avant de pouvoir
            passer commande. Vous serez notifié par e-mail dès que ce sera fait.
          </p>
          <Link href="/">
            <Button size="lg">Retour à l&apos;accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-cream-50 py-12">
        <div className="container mx-auto px-4 text-center py-20">
          <h1 className="text-2xl font-display font-bold text-warm-800 mb-4">
            Votre panier est vide
          </h1>
          <Link href="/produits">
            <Button size="lg">Voir nos produits</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="mb-8"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <h1 className="text-3xl font-display font-bold text-warm-800 mb-2">
            Finaliser ma commande
          </h1>
          <p className="text-warm-600">
            {isCustomer
              ? `${session?.user?.name ?? ''} — paiement à la livraison ou au retrait`
              : `${session?.user?.companyName} — ${session?.user?.paymentTerms ? paymentTermsLabels[session.user.paymentTerms] : ''}`}
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                  className={`flex flex-col items-center gap-2 ${
                    index <= currentStepIndex ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      index <= currentStepIndex
                        ? 'bg-prairie-600 text-white'
                        : 'bg-warm-200 text-warm-500'
                    }`}
                  >
                    {index < currentStepIndex ? <Check className="h-5 w-5" /> : step.icon}
                  </div>
                  <span
                    className={`text-sm font-medium hidden sm:block ${
                      index <= currentStepIndex ? 'text-prairie-600' : 'text-warm-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded ${
                      index < currentStepIndex ? 'bg-prairie-600' : 'bg-warm-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm"
            >
              {/* Step: Adresse */}
              {currentStep === 'adresse' && (
                <div>
                  <h2 className="text-xl font-semibold text-warm-800 mb-6 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-prairie-600" />
                    Adresse de livraison
                  </h2>
                  <div className="space-y-4">
                    <label
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        deliveryMethod === 'retrait'
                          ? 'border-prairie-600 bg-prairie-50'
                          : 'border-warm-200 hover:border-prairie-300'
                      }`}
                    >
                      <input
                        type="radio"
                        checked={deliveryMethod === 'retrait'}
                        onChange={() => setDeliveryMethod('retrait')}
                        className="sr-only"
                      />
                      <Store className="h-5 w-5 text-prairie-600" />
                      <span className="text-warm-800 font-medium">Retrait sur place</span>
                    </label>

                    {deliveryMethod !== 'retrait' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-warm-700 mb-2">
                            Adresse *
                          </label>
                          <Input
                            value={addressInfo.street}
                            onChange={(e) =>
                              setAddressInfo({ ...addressInfo, street: e.target.value })
                            }
                            placeholder="Numéro et nom de rue"
                            required
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-warm-700 mb-2">
                              Ville *
                            </label>
                            <Input
                              value={addressInfo.city}
                              onChange={(e) =>
                                setAddressInfo({ ...addressInfo, city: e.target.value })
                              }
                              placeholder="Antananarivo"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-warm-700 mb-2">
                              Code postal
                            </label>
                            <Input
                              value={addressInfo.postalCode}
                              onChange={(e) =>
                                setAddressInfo({ ...addressInfo, postalCode: e.target.value })
                              }
                              placeholder="101"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Livraison */}
              {currentStep === 'livraison' && (
                <div>
                  <h2 className="text-xl font-semibold text-warm-800 mb-6 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-prairie-600" />
                    Mode de livraison
                  </h2>
                  <div className="space-y-3">
                    <label
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        deliveryMethod === 'standard'
                          ? 'border-prairie-600 bg-prairie-50'
                          : 'border-warm-200 hover:border-prairie-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value="standard"
                        checked={deliveryMethod === 'standard'}
                        onChange={() => setDeliveryMethod('standard')}
                        className="sr-only"
                      />
                      <Truck className={`h-8 w-8 ${deliveryMethod === 'standard' ? 'text-prairie-600' : 'text-warm-400'}`} />
                      <div className="flex-1">
                        <p className="font-medium text-warm-800">Livraison standard</p>
                        <p className="text-sm text-warm-600">Livraison sous 24-48h</p>
                      </div>
                      <span className="font-semibold text-warm-800">
                        {getShippingCost('standard', subtotal, hasFreeShippingItem) === 0 ? (
                          <span className="text-prairie-600">Gratuit</span>
                        ) : (
                          formatPrice(getShippingCost('standard', subtotal, hasFreeShippingItem))
                        )}
                      </span>
                    </label>

                    <label
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                        deliveryMethod === 'express'
                          ? 'border-prairie-600 bg-prairie-50'
                          : 'border-warm-200 hover:border-prairie-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery"
                        value="express"
                        checked={deliveryMethod === 'express'}
                        onChange={() => setDeliveryMethod('express')}
                        className="sr-only"
                      />
                      <Truck className={`h-8 w-8 ${deliveryMethod === 'express' ? 'text-prairie-600' : 'text-warm-400'}`} />
                      <div className="flex-1">
                        <p className="font-medium text-warm-800">Livraison express</p>
                        <p className="text-sm text-warm-600">Livraison le jour même</p>
                      </div>
                      <span className="font-semibold text-warm-800">
                        {getShippingCost('express', subtotal, hasFreeShippingItem) === 0 ? (
                          <span className="text-prairie-600">Gratuit</span>
                        ) : (
                          formatPrice(getShippingCost('express', subtotal, hasFreeShippingItem))
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Step: Confirmation */}
              {currentStep === 'confirmation' && (
                <div>
                  <h2 className="text-xl font-semibold text-warm-800 mb-6 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-prairie-600" />
                    Conditions de paiement
                  </h2>

                  <div className="bg-prairie-50 border border-prairie-200 rounded-lg p-4 mb-6">
                    {isCustomer ? (
                      <>
                        <p className="text-warm-800 font-medium">Paiement à la livraison ou au retrait</p>
                        <p className="text-sm text-warm-600 mt-1">
                          Vous réglez votre commande à la réception. Aucun paiement en ligne n&apos;est demandé.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-warm-800 font-medium">
                          Facturation à {session?.user?.paymentTerms ? paymentTermsLabels[session.user.paymentTerms] : 'réception'}
                        </p>
                        <p className="text-sm text-warm-600 mt-1">
                          Une facture sera générée à la validation de la commande, avec son échéance de paiement.
                        </p>
                      </>
                    )}
                  </div>

                  {belowMoqItems.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <p className="text-red-700 font-medium mb-1">
                        Quantité minimum non atteinte
                      </p>
                      <ul className="text-sm text-red-600 list-disc list-inside">
                        {belowMoqItems.map((item) => (
                          <li key={item.productId}>
                            {item.name} — minimum {formatQuantity(item.moq, item.unit)}, actuellement {item.quantity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-warm-700 mb-2">
                      Notes de commande (optionnel)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Instructions spéciales pour la livraison..."
                      className="w-full px-4 py-3 rounded-lg border border-warm-300 focus:border-prairie-500 focus:ring-2 focus:ring-prairie-200 resize-none"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t border-warm-100">
                {currentStepIndex > 0 ? (
                  <Button
                    variant="outline"
                    onClick={goToPrevStep}
                    icon={<ChevronLeft className="h-4 w-4" />}
                  >
                    Retour
                  </Button>
                ) : (
                  <Link href="/panier">
                    <Button variant="outline" icon={<ChevronLeft className="h-4 w-4" />}>
                      Retour au panier
                    </Button>
                  </Link>
                )}

                {currentStep === 'confirmation' ? (
                  <Button
                    onClick={handleSubmitOrder}
                    disabled={!validateCurrentStep() || isLoading}
                    loading={isLoading}
                  >
                    Confirmer la commande
                  </Button>
                ) : (
                  <Button
                    onClick={goToNextStep}
                    disabled={!validateCurrentStep()}
                    icon={<ChevronRight className="h-4 w-4" />}
                    iconPosition="right"
                  >
                    Continuer
                  </Button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
              <h2 className="text-xl font-semibold text-warm-800 mb-4">Récapitulatif</h2>

              {/* Items */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-warm-50 shrink-0">
                      <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-warm-800 text-sm truncate">{item.name}</p>
                      <p className="text-sm text-warm-600">Qté: {formatQuantity(item.quantity, item.unit)}</p>
                      <p className="text-sm font-semibold text-prairie-600">
                        {formatPrice(unitPrice(item) * item.quantity)}
                      </p>
                      {isUpcoming(item.availableFrom) && (
                        <p className="text-xs text-amber-600 font-medium mt-0.5">
                          📅 Livraison le {formatDeliveryWindow(item.availableFrom!)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-warm-100 pt-4 space-y-2">
                <div className="flex justify-between text-warm-600">
                  <span>Sous-total</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-warm-600">
                  <span>Livraison</span>
                  {shippingCost === 0 ? (
                    <span className="text-prairie-600">Gratuit</span>
                  ) : (
                    <span>{formatPrice(shippingCost)}</span>
                  )}
                </div>
                <div className="flex justify-between text-lg font-semibold text-warm-800 pt-2 border-t border-warm-100">
                  <span>Total</span>
                  <span className="text-prairie-600">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
