'use client';

import React, { useState } from 'react';
import { CheckCircle, Copy, RefreshCw, Smartphone, Zap } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { formatPrice } from '@/lib/utils';
import { usePayment, isPayerNumber, REFERENCE_PATTERN } from '@/hooks/usePayment';
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from '@/lib/api/payments';

interface PaymentPanelProps {
  orderNumber: string;
  email?: string;
  token?: string;
  enabled?: boolean;
}

// Date limite lisible, et alerte quand il reste moins de 6 heures
function formatDeadline(iso: string): { text: string; urgent: boolean } {
  const date = new Date(iso);
  return {
    text: date.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }),
    urgent: date.getTime() - Date.now() < 6 * 60 * 60 * 1000,
  };
}

const STATUS_CLASS: Record<PaymentStatus, string> = {
  awaiting: 'bg-yellow-100 text-yellow-800',
  submitted: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

// Code USSD pour retrouver la demande depuis le téléphone (quand la notification n'apparaît pas)
const USSD_CODE: Partial<Record<string, string>> = { mvola: '#111#' };

// Paiement Mobile Money d'une commande (pages du site en Tailwind).
//  - « instantané » quand l'API de l'opérateur est configurée : MVola et Airtel Money (numéro, confirmation sur le
//    téléphone) ou Orange Money (paiement sur la page d'Orange), avec mise à jour automatique ;
//  - sinon (ou au choix du client) : envoi manuel au numéro marchand puis saisie de la référence de transaction.
export function PaymentPanel({ orderNumber, email, token, enabled = true }: PaymentPanelProps) {
  const { summary, loading, submitting, error, refresh, submit, instant } = usePayment(orderNumber, { email, token, enabled });
  const [reference, setReference] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [instantPhone, setInstantPhone] = useState('');

  if (loading && !summary && !instant.waiting) {
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
  const isPush = instant.flow === 'push';
  const instantPhoneValid = instant.provider ? isPayerNumber(instant.provider, instantPhone) : false;
  const canStart = !instant.starting && (isPush ? instantPhoneValid : true);
  const showAuto = instant.available && (mode === 'auto' || instant.waiting || instant.inReview);
  // Référence « MVOLA:… », « ORANGE_MONEY:… » = paiement lancé par l'API (pas une référence saisie par le client)
  const manualReferenceSent = summary.paymentStatus === 'submitted' && !/^[A-Z_]+:/.test(summary.reference ?? '');
  const ussd = instant.provider ? USSD_CODE[instant.provider] : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (await submit(reference, payerPhone)) setReference('');
  };

  const handleInstant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStart) return;
    await instant.start(isPush ? instantPhone : undefined);
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

      {summary.demo && !cancelledOnly && summary.paymentStatus !== 'paid' && (
        <p role="note" data-testid="demo-banner" className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          <strong>Paiement de démonstration.</strong> MVola, Orange Money et Airtel Money sont simulés : aucun argent n&apos;est
          débité. Avec MVola ou Airtel Money, tout numéro valide « confirme » après quelques secondes ; pour simuler un refus,
          utilisez le 034 35 000 04 (MVola) ou le 033 35 000 04 (Airtel Money).
        </p>
      )}

      {cancelledOnly ? (
        <p className="rounded-lg bg-warm-50 p-3 text-sm text-warm-600">
          Cette commande a été annulée{summary.cancelReason ? ` (${summary.cancelReason.toLowerCase()})` : ''} : aucun paiement n&apos;est
          attendu.
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
          {manualReferenceSent && (
            <p role="status" className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              Référence <strong>{summary.reference}</strong> reçue : nous vérifions votre paiement. Vous pouvez la
              corriger ci-dessous en cas d&apos;erreur.
            </p>
          )}

          {summary.expiresAt && !instant.waiting && !instant.inReview && (
            <p
              role="status"
              className={`mb-3 rounded-lg p-3 text-sm ${
                formatDeadline(summary.expiresAt).urgent ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'
              }`}
            >
              À régler avant le <strong>{formatDeadline(summary.expiresAt).text}</strong> : passé ce délai, la commande est
              annulée automatiquement.
            </p>
          )}

          {showAuto ? (
            instant.waiting ? (
              isPush ? (
                <div role="status" aria-live="polite" className="rounded-lg bg-warm-50 p-4 text-center text-sm text-warm-700">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-prairie-600" aria-hidden="true" />
                  <p className="mb-1 font-semibold text-warm-800">Confirmez sur votre téléphone</p>
                  <p className="mb-1">
                    Demande de <strong className="text-prairie-700">{formatPrice(summary.totalAmount)}</strong> envoyée au{' '}
                    <strong>{instant.payerPhone}</strong>.
                  </p>
                  <p className="mb-1">
                    Ouvrez la notification {instant.label}
                    {ussd ? ` (ou composez ${ussd})` : ''} et validez avec votre code secret.
                  </p>
                  <p className="text-xs text-warm-500">Cette page se met à jour toute seule.</p>
                </div>
              ) : (
                <div role="status" aria-live="polite" className="rounded-lg bg-warm-50 p-4 text-center text-sm text-warm-700">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-prairie-600" aria-hidden="true" />
                  <p className="mb-1 font-semibold text-warm-800">Paiement en cours chez {instant.label}</p>
                  <p className="mb-1">
                    Terminez le paiement de <strong className="text-prairie-700">{formatPrice(summary.totalAmount)}</strong> sur la
                    page sécurisée d&apos;{instant.label}.
                  </p>
                  <p className="mb-3 text-xs text-warm-500">Cette page se met à jour toute seule.</p>
                  {instant.paymentUrl && (
                    <Button type="button" onClick={instant.resume}>
                      Reprendre le paiement
                    </Button>
                  )}
                </div>
              )
            ) : instant.inReview ? (
              <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                Paiement reçu : notre équipe le vérifie, vous serez prévenu par e-mail dès sa validation.
              </p>
            ) : (
              <form onSubmit={handleInstant} className="space-y-3 rounded-lg bg-warm-50 p-4">
                <p className="flex items-center gap-2 font-semibold text-warm-800">
                  <Zap className="h-4 w-4 text-prairie-600" />
                  Payer maintenant avec {instant.label}
                </p>
                <p className="text-sm text-warm-600">
                  {isPush ? (
                    <>
                      Saisissez votre numéro {instant.label} : vous recevrez une demande de paiement de{' '}
                      <strong>{formatPrice(summary.totalAmount)}</strong> à confirmer avec votre code secret.
                    </>
                  ) : (
                    <>
                      Vous serez redirigé vers la page sécurisée d&apos;{instant.label} pour payer{' '}
                      <strong>{formatPrice(summary.totalAmount)}</strong>, puis ramené ici.
                    </>
                  )}
                </p>
                {instant.lastFailure && (
                  <p role="alert" className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
                    {instant.lastFailure} Vous pouvez réessayer.
                  </p>
                )}
                {isPush && (
                  <Input
                    label={`Votre numéro ${instant.label}`}
                    type="tel"
                    value={instantPhone}
                    onChange={(e) => setInstantPhone(e.target.value)}
                    placeholder={instant.phonePlaceholder}
                    maxLength={30}
                    autoComplete="tel"
                    error={
                      instantPhone && !instantPhoneValid
                        ? `Numéro ${instant.label} invalide : il commence par ${instant.phonePrefixes}.`
                        : undefined
                    }
                    required
                  />
                )}
                {instant.error && (
                  <p role="alert" className="text-sm text-red-600">
                    {instant.error}
                  </p>
                )}
                <Button type="submit" loading={instant.starting} disabled={!canStart}>
                  {isPush ? `Payer ${formatPrice(summary.totalAmount)}` : `Payer ${formatPrice(summary.totalAmount)} avec ${instant.label}`}
                </Button>
                <button type="button" onClick={() => setMode('manual')} className="block text-sm text-prairie-700 underline">
                  Payer autrement : envoyer l&apos;argent moi-même et saisir la référence
                </button>
              </form>
            )
          ) : (
            <>
              {instant.available && (
                <button type="button" onClick={() => setMode('auto')} className="mb-3 block text-sm text-prairie-700 underline">
                  Revenir au paiement instantané {instant.label}
                </button>
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
                <p className="mt-2 text-xs text-warm-500">Puis saisissez la référence de la transaction reçue par SMS.</p>
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
                    {manualReferenceSent ? 'Corriger la référence' : 'J’ai payé, envoyer la référence'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={refresh} icon={<RefreshCw className="h-4 w-4" />}>
                    Actualiser
                  </Button>
                </div>
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default PaymentPanel;
