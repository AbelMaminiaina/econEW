'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPaymentStatus, submitPayment, type PaymentSummary } from '@/lib/api/payments';

// Référence de transaction Mobile Money : mêmes règles que le serveur (4 à 60 caractères)
export const REFERENCE_PATTERN = /^[A-Za-z0-9._\-/ ]{4,60}$/;

interface UsePaymentOptions {
  /** E-mail saisi à la commande (visiteur sans compte) */
  email?: string;
  /** Jeton du client connecté */
  token?: string;
  /** Attendre que l'identité soit connue (session chargée) avant d'interroger l'API */
  enabled?: boolean;
}

// État du paiement d'une commande (et des commandes de son panier) + envoi de la référence.
export function usePayment(orderNumber: string | null, { email, token, enabled = true }: UsePaymentOptions) {
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!orderNumber || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      setSummary(await getPaymentStatus(orderNumber, { email, token }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le paiement');
    } finally {
      setLoading(false);
    }
  }, [orderNumber, email, token, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = useCallback(
    async (reference: string, payerPhone: string): Promise<boolean> => {
      if (!orderNumber) return false;
      setSubmitting(true);
      setError(null);
      try {
        await submitPayment({ orderNumber, reference: reference.trim(), payerPhone: payerPhone.trim(), email }, token);
        setSummary(await getPaymentStatus(orderNumber, { email, token }));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible d’enregistrer la référence');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [orderNumber, email, token]
  );

  return { summary, loading, submitting, error, refresh, submit };
}
