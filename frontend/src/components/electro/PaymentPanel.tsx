'use client';

import React, { useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { usePayment, REFERENCE_PATTERN } from '@/hooks/usePayment';
import { PAYMENT_STATUS_LABELS } from '@/lib/api/payments';
import { useToast } from '@/components/electro/Toast';

interface PaymentPanelProps {
  orderNumber: string;
  email?: string;
  token?: string;
  enabled?: boolean;
}

const STATUS_STYLE = {
  awaiting: { badge: 'bg-warning text-dark', icon: 'fa-hourglass-half' },
  submitted: { badge: 'bg-info text-dark', icon: 'fa-search-dollar' },
  paid: { badge: 'bg-success', icon: 'fa-check-circle' },
  rejected: { badge: 'bg-danger', icon: 'fa-exclamation-triangle' },
} as const;

// Paiement Mobile Money d'une commande (template Electro / Bootstrap) : instructions, saisie de la
// référence de transaction et état de la vérification.
export function PaymentPanel({ orderNumber, email, token, enabled = true }: PaymentPanelProps) {
  const { addToast } = useToast();
  const { summary, loading, submitting, error, refresh, submit } = usePayment(orderNumber, { email, token, enabled });
  const [reference, setReference] = useState('');
  const [payerPhone, setPayerPhone] = useState('');

  if (loading && !summary) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement…</span>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="alert alert-warning" role="alert">
        {error ?? 'Paiement introuvable.'}
      </div>
    );
  }

  const style = STATUS_STYLE[summary.paymentStatus];
  const referenceValid = REFERENCE_PATTERN.test(reference.trim());
  const canSubmit = referenceValid && payerPhone.trim().length >= 6 && !submitting;
  const cancelledOnly = summary.orders.every((o) => o.status === 'cancelled');

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    addToast('info', 'Numéro copié');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (await submit(reference, payerPhone)) {
      setReference('');
      addToast('success', 'Référence envoyée : votre paiement va être vérifié');
    }
  };

  return (
    <div className="border rounded p-4 mb-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h4 className="mb-0">
          <i className="fas fa-mobile-alt text-primary me-2"></i>Paiement {summary.methodLabel ?? 'Mobile Money'}
        </h4>
        <span className={`badge rounded-pill py-2 px-3 ${style.badge}`}>
          <i className={`fas ${style.icon} me-1`}></i>
          {PAYMENT_STATUS_LABELS[summary.paymentStatus]}
        </span>
      </div>

      {summary.orders.length > 1 && (
        <ul className="list-unstyled small mb-3">
          {summary.orders.map((o) => (
            <li key={o.orderNumber} className="d-flex justify-content-between">
              <span>
                {o.orderNumber}
                {o.sellerName ? ` — ${o.sellerName}` : ''}
              </span>
              <span>{formatPrice(o.total)}</span>
            </li>
          ))}
        </ul>
      )}

      {cancelledOnly ? (
        <div className="alert alert-secondary mb-0">Cette commande a été annulée : aucun paiement n&apos;est attendu.</div>
      ) : summary.paymentStatus === 'paid' ? (
        <div className="alert alert-success mb-0">
          <strong>Paiement confirmé.</strong> Merci ! Votre commande est en cours de traitement.
        </div>
      ) : (
        <>
          {summary.paymentStatus === 'rejected' && (
            <div className="alert alert-danger" role="alert">
              <strong>Nous n&apos;avons pas pu valider votre paiement.</strong>
              {summary.rejectionReason && <div>Motif : {summary.rejectionReason}</div>}
              <div>Vérifiez votre transaction puis saisissez de nouveau la référence ci-dessous.</div>
            </div>
          )}

          {summary.paymentStatus === 'submitted' && (
            <div className="alert alert-info" role="status">
              Référence <strong>{summary.reference}</strong> reçue : nous vérifions votre paiement. Vous serez prévenu
              par e-mail. Vous pouvez la corriger ci-dessous en cas d&apos;erreur.
            </div>
          )}

          <div className="bg-light rounded p-3 mb-4">
            <p className="text-dark fw-bold mb-2">Comment payer</p>
            <ol className="mb-3 ps-3">
              <li>
                Ouvrez <strong>{summary.methodLabel}</strong> sur votre téléphone.
              </li>
              <li>
                Envoyez exactement <strong className="text-primary">{formatPrice(summary.totalAmount)}</strong> au
                numéro ci-dessous.
              </li>
              <li>Notez la référence de la transaction (reçue par SMS) et saisissez-la ici.</li>
            </ol>
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 bg-white border rounded p-3">
              <div>
                <small className="d-block">Numéro {summary.methodLabel}</small>
                <span className="fs-4 fw-bold text-dark">{summary.number ?? 'Indisponible'}</span>
                {summary.accountName && <small className="d-block">Bénéficiaire : {summary.accountName}</small>}
              </div>
              {summary.number && (
                <button
                  type="button"
                  className="btn btn-md-square rounded-circle bg-white border"
                  onClick={() => copy(summary.number!)}
                  aria-label="Copier le numéro"
                >
                  <i className="far fa-copy"></i>
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label htmlFor="pay-ref" className="form-label text-dark">Référence de la transaction *</label>
                <input
                  id="pay-ref"
                  className={`form-control py-3${reference && !referenceValid ? ' is-invalid' : ''}`}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex. MP260920.1234.A56789"
                  maxLength={60}
                  autoComplete="off"
                  required
                />
                <div className="invalid-feedback">4 à 60 caractères (lettres, chiffres, . - _ /).</div>
              </div>
              <div className="col-md-6">
                <label htmlFor="pay-phone" className="form-label text-dark">Numéro utilisé pour payer *</label>
                <input
                  id="pay-phone"
                  type="tel"
                  className="form-control py-3"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="034 00 000 00"
                  maxLength={30}
                  autoComplete="tel"
                  required
                />
              </div>
            </div>
            {error && <div className="alert alert-danger mt-3 mb-0" role="alert">{error}</div>}
            <div className="d-flex flex-wrap gap-2 mt-4">
              <button type="submit" className="btn btn-primary rounded-pill py-3 px-5" disabled={!canSubmit}>
                {submitting && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>}
                {summary.paymentStatus === 'submitted' ? 'Corriger la référence' : 'J’ai payé, envoyer la référence'}
              </button>
              <button type="button" className="btn btn-light rounded-pill py-3 px-4" onClick={refresh} disabled={loading}>
                <i className="fas fa-sync-alt me-2"></i>Actualiser
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default PaymentPanel;
