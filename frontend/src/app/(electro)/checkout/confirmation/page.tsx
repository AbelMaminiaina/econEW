'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/electro/PageHeader';
import { PaymentPanel } from '@/components/electro/PaymentPanel';
import { useToast } from '@/components/electro/Toast';
import { GUEST_EMAIL_KEY } from '@/hooks/usePayment';

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  // Une commande par vendeur : les numéros sont séparés par des virgules
  const orderNumbers = (searchParams.get('order') || 'N/A').split(',').filter(Boolean);
  // Commande sans compte : l'e-mail saisi sert, avec le numéro, à suivre la commande
  // Au retour de la page de paiement d'un opérateur (?paiement=retour), l'adresse ne contient pas l'e-mail : le
  // navigateur l'a gardé le temps de l'aller-retour.
  const returningFromOperator = searchParams.get('paiement') !== null;
  const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!returningFromOperator) return;
    try {
      setRememberedEmail(sessionStorage.getItem(GUEST_EMAIL_KEY));
    } catch {
      // stockage indisponible : le visiteur peut retrouver sa commande avec le suivi
    }
  }, [returningFromOperator]);
  const guestEmail = searchParams.get('guest') ?? rememberedEmail;
  const { data: session, status: authStatus } = useSession();
  // Le paiement se règle avec l'identité de l'acheteur : session connectée ou e-mail du visiteur
  const identityReady = Boolean(guestEmail) || authStatus !== 'loading';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('info', 'Numéro copié');
  };

  return (
    <>
      <PageHeader title="Paiement de la commande" crumbs={[{ label: 'Commande', href: '/checkout' }, { label: 'Confirmation' }]} />
      <div className="container-fluid py-5">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-lg-7">
              <div className="text-center mb-5">
                <i className="fas fa-check-circle display-1 text-primary mb-3 d-block"></i>
                <h2 className="mb-3">Commande enregistrée !</h2>
                <p className="mb-0">
                  Il ne reste qu&apos;à régler par Mobile Money : votre commande sera traitée dès que votre paiement aura
                  été vérifié. Les instructions vous ont aussi été envoyées par e-mail.
                </p>
              </div>

              <PaymentPanel
                orderNumber={orderNumbers[0]}
                email={guestEmail ?? undefined}
                token={guestEmail ? undefined : session?.accessToken}
                enabled={identityReady}
              />

              {orderNumbers.length > 1 && (
                <p className="text-center mb-3">
                  Votre panier contenait des produits de {orderNumbers.length} vendeurs : une commande a été créée
                  pour chacun, suivie séparément.
                </p>
              )}

              {orderNumbers.map((orderNumber) => (
                <div key={orderNumber} className="bg-light rounded p-4 mb-3 d-flex justify-content-between align-items-center">
                  <div>
                    <small>Numéro de commande</small>
                    <h3 className="text-dark mb-0">{orderNumber}</h3>
                  </div>
                  <button
                    type="button"
                    className="btn btn-md-square rounded-circle bg-white border"
                    onClick={() => copyToClipboard(orderNumber)}
                    aria-label={`Copier le numéro de commande ${orderNumber}`}
                  >
                    <i className="far fa-copy"></i>
                  </button>
                </div>
              ))}

              {guestEmail && (
                <div className="bg-light rounded p-4 mb-4">
                  <h5 className="text-dark mb-2"><i className="fas fa-info-circle text-primary me-2"></i>Commande sans compte</h5>
                  <p className="mb-2">
                    Un e-mail de confirmation a été envoyé à <strong className="text-dark">{guestEmail}</strong>.
                    Conservez {orderNumbers.length > 1 ? 'ces numéros' : 'ce numéro'} : il permet de suivre votre commande
                    avec cette adresse e-mail.
                  </p>
                  <Link
                    href={`/suivi-commande?order=${encodeURIComponent(orderNumbers[0])}&email=${encodeURIComponent(guestEmail)}`}
                    className="text-primary fw-bold"
                  >
                    Suivre ma commande <i className="fas fa-arrow-right ms-1"></i>
                  </Link>
                </div>
              )}

              <div className="d-flex flex-wrap justify-content-center gap-3">
                <Link href="/suivi-commande" className="btn btn-light rounded-pill py-3 px-5">
                  <i className="fas fa-box me-2"></i>Suivre ma commande
                </Link>
                <Link href="/produits" className="btn btn-primary rounded-pill py-3 px-5">
                  <i className="fas fa-shopping-bag me-2"></i>Continuer mes achats
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="container py-5 text-center">Chargement…</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
