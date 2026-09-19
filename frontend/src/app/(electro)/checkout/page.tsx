'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { useCompanyAccess } from '@/hooks/useCompanyAccess';
import { formatDeliveryWindow, formatPrice, formatQuantity, getShippingCost, groupBySeller, isUpcoming, resolveUnitPrice } from '@/lib/utils';
import { PageHeader } from '@/components/electro/PageHeader';
import { createOrder } from '@/lib/api/checkout';
import { getPaymentMethods, type PaymentMethodId, type PaymentMethodInfo } from '@/lib/api/payments';
import { filterCheckoutSteps } from './checkout-steps';

type Step = 'contact' | 'adresse' | 'livraison' | 'confirmation';
type DeliveryMethod = 'standard' | 'express' | 'retrait';

interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AddressInfo {
  street: string;
  city: string;
  postalCode: string;
}

const ALL_STEPS: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: 'contact', label: 'Coordonnées', icon: <i className="fas fa-user"></i> },
  { id: 'adresse', label: 'Adresse', icon: <i className="fas fa-map-marker-alt"></i> },
  { id: 'livraison', label: 'Livraison', icon: <i className="fas fa-truck"></i> },
  { id: 'confirmation', label: 'Paiement', icon: <i className="fas fa-mobile-alt"></i> },
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

  // Paiement Mobile Money obligatoire pour tous (visiteurs, particuliers, entreprises)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodInfo[] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [paymentMethodsError, setPaymentMethodsError] = useState(false);

  useEffect(() => {
    getPaymentMethods()
      .then((methods) => {
        setPaymentMethods(methods);
        setPaymentMethod((current) => current ?? methods[0]?.id ?? null);
      })
      .catch(() => setPaymentMethodsError(true));
  }, []);

  // Visiteur sans compte : il remplit ses coordonnées dans le tunnel (pas de connexion obligatoire)
  const isGuest = status === 'unauthenticated';
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '', phone: '' });
  const [website, setWebsite] = useState(''); // champ piège anti-robot : reste vide pour un humain
  const guestStepShown = useRef(false);

  // Un visiteur commence par l'étape « Coordonnées » (une seule fois, quand on sait qu'il n'est pas connecté)
  useEffect(() => {
    if (isGuest && !guestStepShown.current) {
      guestStepShown.current = true;
      setCurrentStep('contact');
    }
  }, [isGuest]);

  const unitPrice = (item: (typeof cart.items)[number]) =>
    isApproved ? resolveUnitPrice(item.price, item.priceTiers, item.quantity) : item.price;

  // Calculations
  const subtotal = cart.items.reduce((sum, item) => sum + unitPrice(item) * item.quantity, 0);
  // Une commande (et des frais de livraison) par vendeur
  const sellerGroups = groupBySeller(cart.items);
  const shippingFor = (method: DeliveryMethod) =>
    sellerGroups.reduce(
      (sum, group) =>
        sum +
        getShippingCost(
          method,
          group.items.reduce((acc, item) => acc + unitPrice(item) * item.quantity, 0),
          group.items.some((item) => item.freeShipping)
        ),
      0
    );
  const hasFreeShippingItem = sellerGroups.every((group) => group.items.some((item) => item.freeShipping));
  const shippingCost = shippingFor(deliveryMethod);
  const total = subtotal + shippingCost;

  const belowMoqItems = cart.items.filter((item) => item.quantity < item.moq);

  const steps = useMemo(
    () => filterCheckoutSteps(ALL_STEPS, hasFreeShippingItem, isGuest),
    [hasFreeShippingItem, isGuest]
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
      case 'contact':
        return (
          guestInfo.name.trim().length >= 2 &&
          EMAIL_PATTERN.test(guestInfo.email.trim()) &&
          guestInfo.phone.trim().length >= 6
        );
      case 'adresse':
        if (deliveryMethod === 'retrait') return true;
        return !!(addressInfo.street && addressInfo.city);
      case 'livraison':
        return !!deliveryMethod;
      case 'confirmation':
        return belowMoqItems.length === 0 && !!paymentMethod;
      default:
        return false;
    }
  };

  const handleSubmitOrder = async () => {
    if (!validateCurrentStep() || !paymentMethod || (!isGuest && !accessToken)) return;

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
          paymentMethod,
          notes: notes || undefined,
          ...(isGuest
            ? {
                guest: {
                  name: guestInfo.name.trim(),
                  email: guestInfo.email.trim(),
                  phone: guestInfo.phone.trim(),
                },
                website,
              }
            : {}),
        },
        isGuest ? undefined : accessToken
      );

      if (response.success && response.orderNumber) {
        cart.clearCart();
        const numbers = response.orders?.map((o) => o.orderNumber) ?? [response.orderNumber];
        router.push(
          `/checkout/confirmation?order=${numbers.join(',')}${
            isGuest ? `&guest=${encodeURIComponent(guestInfo.email.trim())}` : ''
          }`
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

  if (status === 'loading') {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Chargement…</span>
        </div>
      </div>
    );
  }

  if (!canOrder) {
    return (
      <>
        <PageHeader title="Commande" crumbs={[{ label: 'Panier', href: '/panier' }, { label: 'Commande' }]} />
        <div className="container py-5 text-center" style={{ maxWidth: 640 }}>
          <i className="fas fa-hourglass-half display-1 text-secondary mb-4 d-block"></i>
          <h2 className="mb-3">Compte en attente de validation</h2>
          <p className="mb-4">
            Votre compte professionnel doit être approuvé par notre équipe avant de pouvoir passer commande. Vous
            serez notifié par e-mail dès que ce sera fait.
          </p>
          <Link href="/" className="btn btn-primary rounded-pill py-3 px-5">Retour à l&apos;accueil</Link>
        </div>
      </>
    );
  }

  if (cart.items.length === 0) {
    return (
      <>
        <PageHeader title="Commande" crumbs={[{ label: 'Panier', href: '/panier' }, { label: 'Commande' }]} />
        <div className="container py-5 text-center">
          <h2 className="mb-4">Votre panier est vide</h2>
          <Link href="/produits" className="btn btn-primary rounded-pill py-3 px-5">Voir nos produits</Link>
        </div>
      </>
    );
  }

  const optionClass = (selected: boolean) =>
    `d-flex align-items-center gap-3 p-3 rounded border border-2 mb-3 ${selected ? 'border-primary bg-light' : ''}`;

  return (
    <>
      <PageHeader
        title="Finaliser ma commande"
        crumbs={[{ label: 'Panier', href: '/panier' }, { label: 'Commande' }]}
        description={
          isGuest
            ? 'Commande sans compte — paiement par Mobile Money'
            : isCustomer
            ? `${session?.user?.name ?? ''} — paiement par Mobile Money`
            : `${session?.user?.companyName ?? ''} — paiement par Mobile Money`
        }
      />

      <div className="container-fluid py-5">
        <div className="container py-4">
          {/* Étapes */}
          <div className="d-flex align-items-center justify-content-between mx-auto mb-5" style={{ maxWidth: 640 }}>
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => index <= currentStepIndex && setCurrentStep(step.id)}
                  className="btn btn-link text-decoration-none d-flex flex-column align-items-center p-0"
                  style={{ cursor: index <= currentStepIndex ? 'pointer' : 'default' }}
                >
                  <span
                    className={`rounded-circle d-flex align-items-center justify-content-center ${
                      index <= currentStepIndex ? 'bg-primary text-white' : 'bg-light text-muted border'
                    }`}
                    style={{ width: 52, height: 52 }}
                  >
                    {index < currentStepIndex ? <i className="fas fa-check"></i> : step.icon}
                  </span>
                  <span className={`mt-2 d-none d-sm-block ${index <= currentStepIndex ? 'text-primary' : 'text-muted'}`}>
                    {step.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-grow-1 mx-2 rounded ${index < currentStepIndex ? 'bg-primary' : 'bg-light'}`} style={{ height: 4 }} />
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="row g-5">
            <div className="col-lg-8">
              <div className="border rounded p-4">
                {currentStep === 'contact' && (
                  <div>
                    <h4 className="mb-2"><i className="fas fa-user text-primary me-2"></i>Vos coordonnées</h4>
                    <p className="mb-4">
                      Commandez sans créer de compte. Vous avez déjà un compte ?{' '}
                      <Link href="/connexion?callbackUrl=/checkout" className="text-primary fw-bold">
                        Connectez-vous
                      </Link>{' '}
                      (votre panier est conservé).
                    </p>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label htmlFor="guest-name" className="form-label text-dark">Nom complet *</label>
                        <input
                          id="guest-name"
                          className="form-control py-3"
                          autoComplete="name"
                          value={guestInfo.name}
                          onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                          placeholder="Jean Rakoto"
                          maxLength={100}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="guest-phone" className="form-label text-dark">Téléphone *</label>
                        <input
                          id="guest-phone"
                          type="tel"
                          className="form-control py-3"
                          autoComplete="tel"
                          value={guestInfo.phone}
                          onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                          placeholder="034 00 000 00"
                          maxLength={30}
                          required
                        />
                        <div className="form-text">Pour organiser la livraison ou le retrait.</div>
                      </div>
                      <div className="col-12">
                        <label htmlFor="guest-email" className="form-label text-dark">E-mail *</label>
                        <input
                          id="guest-email"
                          type="email"
                          className={`form-control py-3${guestInfo.email && !EMAIL_PATTERN.test(guestInfo.email.trim()) ? ' is-invalid' : ''}`}
                          autoComplete="email"
                          value={guestInfo.email}
                          onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                          placeholder="jean@exemple.mg"
                          maxLength={200}
                          required
                        />
                        <div className="invalid-feedback">Adresse e-mail invalide.</div>
                        <div className="form-text">
                          La confirmation et les instructions de paiement y seront envoyées. Gardez-la : elle vous sert à suivre votre commande.
                        </div>
                      </div>
                    </div>
                    {/* Champ piège pour les robots : caché aux humains */}
                    <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true">
                      <label htmlFor="guest-website">Ne pas remplir</label>
                      <input
                        id="guest-website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                    </div>
                    <p className="small mt-4 mb-0">
                      <i className="fas fa-lock text-primary me-1"></i>
                      Vos coordonnées servent uniquement à traiter et livrer votre commande.
                    </p>
                  </div>
                )}

                {currentStep === 'adresse' && (
                  <div>
                    <h4 className="mb-4"><i className="fas fa-map-marker-alt text-primary me-2"></i>Adresse de livraison</h4>
                    <label className={optionClass(deliveryMethod === 'retrait')} style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="pickup"
                        className="form-check-input mt-0"
                        checked={deliveryMethod === 'retrait'}
                        onChange={() => setDeliveryMethod('retrait')}
                      />
                      <i className="fas fa-store text-primary"></i>
                      <span className="text-dark fw-bold">Retrait sur place</span>
                    </label>

                    {deliveryMethod !== 'retrait' && (
                      <>
                        <div className="mb-3">
                          <label htmlFor="street" className="form-label text-dark">Adresse *</label>
                          <input
                            id="street"
                            className="form-control py-3"
                            value={addressInfo.street}
                            onChange={(e) => setAddressInfo({ ...addressInfo, street: e.target.value })}
                            placeholder="Numéro et nom de rue"
                            required
                          />
                        </div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label htmlFor="city" className="form-label text-dark">Ville *</label>
                            <input
                              id="city"
                              className="form-control py-3"
                              value={addressInfo.city}
                              onChange={(e) => setAddressInfo({ ...addressInfo, city: e.target.value })}
                              placeholder="Antananarivo"
                              required
                            />
                          </div>
                          <div className="col-md-6">
                            <label htmlFor="postal" className="form-label text-dark">Code postal</label>
                            <input
                              id="postal"
                              className="form-control py-3"
                              value={addressInfo.postalCode}
                              onChange={(e) => setAddressInfo({ ...addressInfo, postalCode: e.target.value })}
                              placeholder="101"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {currentStep === 'livraison' && (
                  <div>
                    <h4 className="mb-4"><i className="fas fa-truck text-primary me-2"></i>Mode de livraison</h4>
                    {(['standard', 'express'] as const).map((method) => {
                      const cost = shippingFor(method);
                      return (
                        <label key={method} className={optionClass(deliveryMethod === method)} style={{ cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="delivery"
                            value={method}
                            className="form-check-input mt-0"
                            checked={deliveryMethod === method}
                            onChange={() => setDeliveryMethod(method)}
                          />
                          <i className={`fas fa-truck fa-2x ${deliveryMethod === method ? 'text-primary' : 'text-muted'}`}></i>
                          <div className="flex-grow-1">
                            <div className="text-dark fw-bold">
                              {method === 'standard' ? 'Livraison standard' : 'Livraison express'}
                            </div>
                            <small>{method === 'standard' ? 'Livraison sous 24-48h' : 'Livraison le jour même'}</small>
                          </div>
                          <span className="text-dark fw-bold">
                            {cost === 0 ? <span className="text-primary">Gratuit</span> : formatPrice(cost)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {currentStep === 'confirmation' && (
                  <div>
                    <h4 className="mb-2"><i className="fas fa-mobile-alt text-primary me-2"></i>Paiement par Mobile Money</h4>
                    <p className="mb-4">
                      Le paiement en ligne est demandé à la commande : choisissez votre opérateur. Après validation, le
                      numéro à créditer vous est indiqué et votre commande est traitée dès que votre paiement est vérifié.
                    </p>

                    {paymentMethods === null && !paymentMethodsError && (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                          <span className="visually-hidden">Chargement…</span>
                        </div>
                      </div>
                    )}
                    {paymentMethodsError && (
                      <div className="alert alert-danger" role="alert">
                        Impossible de charger les moyens de paiement. Actualisez la page.
                      </div>
                    )}
                    {paymentMethods?.length === 0 && (
                      <div className="alert alert-warning" role="alert">
                        Aucun moyen de paiement n&apos;est disponible pour le moment. Merci de réessayer plus tard.
                      </div>
                    )}
                    {paymentMethods?.map((method) => (
                      <label key={method.id} className={optionClass(paymentMethod === method.id)} style={{ cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="payment"
                          value={method.id}
                          className="form-check-input mt-0"
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                        />
                        <i className={`fas fa-mobile-alt fa-2x ${paymentMethod === method.id ? 'text-primary' : 'text-muted'}`}></i>
                        <div className="flex-grow-1">
                          <div className="text-dark fw-bold">{method.label}</div>
                          <small>Paiement du montant total : {formatPrice(total)}</small>
                        </div>
                      </label>
                    ))}
                    <p className="small mb-4">
                      <i className="fas fa-info-circle text-primary me-1"></i>
                      Le paiement par carte bancaire n&apos;est pas encore disponible.
                    </p>

                    {belowMoqItems.length > 0 && (
                      <div className="alert alert-danger" role="alert">
                        <strong>Quantité minimum non atteinte</strong>
                        <ul className="mb-0 mt-1">
                          {belowMoqItems.map((item) => (
                            <li key={item.productId}>
                              {item.name} — minimum {formatQuantity(item.moq, item.unit)}, actuellement {item.quantity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <label htmlFor="notes" className="form-label text-dark">Notes de commande (optionnel)</label>
                      <textarea
                        id="notes"
                        className="form-control"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Instructions spéciales pour la livraison..."
                      />
                    </div>
                  </div>
                )}

                {error && <div className="alert alert-danger mt-4 mb-0" role="alert">{error}</div>}

                <div className="d-flex justify-content-between mt-5 pt-4 border-top">
                  {currentStepIndex > 0 ? (
                    <button type="button" className="btn btn-light rounded-pill py-3 px-4" onClick={goToPrevStep}>
                      <i className="fas fa-chevron-left me-2"></i>Retour
                    </button>
                  ) : (
                    <Link href="/panier" className="btn btn-light rounded-pill py-3 px-4">
                      <i className="fas fa-chevron-left me-2"></i>Retour au panier
                    </Link>
                  )}

                  {currentStep === 'confirmation' ? (
                    <button
                      type="button"
                      className="btn btn-primary rounded-pill py-3 px-5"
                      onClick={handleSubmitOrder}
                      disabled={!validateCurrentStep() || isLoading}
                    >
                      {isLoading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
                      Valider et payer {formatPrice(total)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary rounded-pill py-3 px-5"
                      onClick={goToNextStep}
                      disabled={!validateCurrentStep()}
                    >
                      Continuer<i className="fas fa-chevron-right ms-2"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="col-lg-4">
              <div className="bg-light rounded p-4">
                <h4 className="mb-4">Récapitulatif</h4>
                <div className="mb-3" style={{ maxHeight: 280, overflowY: 'auto' }}>
                  {cart.items.map((item) => (
                    <div key={item.productId} className="d-flex mb-3">
                      <Image src={item.image} alt={item.name} width={60} height={60} className="rounded bg-white me-3" style={{ objectFit: 'cover' }} />
                      <div className="flex-grow-1 min-w-0">
                        <p className="text-dark fw-bold mb-0 small">{item.name}</p>
                        <small className="d-block">Qté : {formatQuantity(item.quantity, item.unit)}</small>
                        <small className="text-primary fw-bold">{formatPrice(unitPrice(item) * item.quantity)}</small>
                        {isUpcoming(item.availableFrom) && (
                          <small className="d-block text-warning">Livraison le {formatDeliveryWindow(item.availableFrom!)}</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-top pt-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Sous-total</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Livraison</span>
                    {shippingCost === 0 ? <span className="text-primary">Gratuit</span> : <span>{formatPrice(shippingCost)}</span>}
                  </div>
                  <div className="d-flex justify-content-between border-top pt-3">
                    <h5 className="mb-0">Total</h5>
                    <h5 className="mb-0 text-primary">{formatPrice(total)}</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
