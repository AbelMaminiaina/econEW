'use client';

import React, { useState } from 'react';
import { CheckCircle, Copy, RefreshCw, Smartphone } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { usePayment, REFERENCE_PATTERN } from '@/hooks/usePayment';
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '@/lib/api/payments';

interface PaymentPanelProps {
  orderNumber: string;
  email?: string;
  token?: string;
  enabled?: boolean;
}

const STATUS_CLASS: Record<PaymentStatus, string> = {
  awaiting: 'bg-yellow-100 text-yellow-800',
  submitted: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

// Paiement Mobile Money d'une commande (pages du site en Tailwind) : instructions, saisie de la
// référence de transaction et état de la vérification.
export function PaymentPanel({ orderNumber, email, token, enabled = true }: PaymentPanelProps) {
  const { summary, loading, submitting, error, refresh, submit } = usePayment(orderNumber, { email, token, enabled });
  const [reference, setReference] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [copied, setCopied] = useState(false);

  if (loading && !summary) {
    return <div className="h-24 animate-pulse rounded-xl bg-warm-50" aria-busy="true" />;
  }
  if (!summary) {
    return (
      <p role="alert" className="rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800">
        {error ?? 'Paiement introuvable.'}
      </p>
    );
  }

  const referenceValid = REFERENCE_PATTERN.test(reference.trim());
  const canSubmit = referenceValid && payerPhone.trim().length >= 6;
  const cancelledOnly = summary.orders.every((o) => o.status === 'cancelled');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (await submit(reference, payerPhone)) setReference('');
  };

  const copyNumber = () => {
    if (!summary.number) return;
    navigator.clipboard?.writeText(summary.number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-warm-200 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-semibold text-warm-800">
          <Smartphone className="h-4 w-4 text-prairie-600" />
          Paiement {summary.methodLabel ?? 'Mobile Money'}
        </h4>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASS[summary.paymentStatus]}`}>
          {PAYMENT_STATUS_LABELS[summary.paymentStatus]}
        </span>
      </div>

      {summary.orders.length > 1 && (
        <ul className="mb-3 space-y-1 text-xs text-warm-600">
          {summary.orders.map((o) => (
            <li key={o.orderNumber} className="flex justify-between gap-2">
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
        <p className="rounded-lg bg-warm-50 p-3 text-sm text-warm-600">
          Cette commande a été annulée : aucun paiement n&apos;est attendu.
        </p>
      ) : summary.paymentStatus === 'paid' ? (
        <p className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          <CheckCircle className="h-4 w-4" />
          Paiement confirmé. Votre commande est en cours de traitement.
        </p>
      ) : (
        <>
          {summary.paymentStatus === 'rejected' && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Nous n&apos;avons pas pu valider votre paiement.
              {summary.rejectionReason && <> Motif : {summary.rejectionReason}.</>} Vérifiez votre transaction puis
              saisissez de nouveau la référence.
            </p>
          )}
          {summary.paymentStatus === 'submitted' && (
            <p role="status" className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              Référence <strong>{summary.reference}</strong> reçue : nous vérifions votre paiement. Vous pouvez la
              corriger ci-dessous en cas d&apos;erreur.
            </p>
          )}

          <div className="mb-4 rounded-lg bg-warm-50 p-3 text-sm text-warm-700">
            <p className="mb-2">
              Envoyez exactement <strong className="text-prairie-700">{formatPrice(summary.totalAmount)}</strong> par{' '}
              {summary.methodLabel} au numéro :
            </p>
            <div className="flex items-center justify-between gap-2 rounded-lg bg-white p-3">
              <div>
                <p className="text-lg font-bold text-warm-800">{summary.number ?? 'Indisponible'}</p>
                {summary.accountName && <p className="text-xs text-warm-500">Bénéficiaire : {summary.accountName}</p>}
              </div>
              {summary.number && (
                <button
                  type="button"
                  onClick={copyNumber}
                  aria-label="Copier le numéro"
                  className="rounded-full p-2 text-warm-600 hover:bg-warm-100"
                >
                  {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-warm-500">
              Puis saisissez la référence de la transaction reçue par SMS.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Référence de la transaction"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex. MP260920.1234.A56789"
              maxLength={60}
              autoComplete="off"
              required
            />
            <Input
              label="Numéro utilisé pour payer"
              type="tel"
              value={payerPhone}
              onChange={(e) => setPayerPhone(e.target.value)}
              placeholder="034 00 000 00"
              maxLength={30}
              required
            />
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={submitting} disabled={!canSubmit}>
                {summary.paymentStatus === 'submitted' ? 'Corriger la référence' : 'J’ai payé, envoyer la référence'}
              </Button>
              <Button type="button" variant="ghost" onClick={refresh} icon={<RefreshCw className="h-4 w-4" />}>
                Actualiser
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default PaymentPanel;
