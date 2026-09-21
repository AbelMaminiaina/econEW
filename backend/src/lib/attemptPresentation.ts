// Une tentative de paiement automatique est marquée « completed » AVANT que les commandes du panier ne soient
// passées en « payées » (la réclamation conditionnelle qui évite un double règlement se fait en premier).
// Pendant ce court instant, dire « terminé » au navigateur le ferait arrêter d'attendre avec un affichage
// périmé : on répond « en cours » tant que des commandes ne sont pas réglées, mais seulement pendant 30 s
// (au-delà, on ne masque plus rien pour ne jamais faire attendre le client indéfiniment).

const SETTLING_WINDOW_MS = 30_000;

export function presentedAttempt<T extends { status: string; updatedAt: Date }>(
  attempt: T,
  group: { status: string; paymentStatus: string }[]
): T {
  const settling =
    attempt.status === 'completed' &&
    Date.now() - attempt.updatedAt.getTime() < SETTLING_WINDOW_MS &&
    group.some((o) => o.status !== 'cancelled' && o.paymentStatus !== 'paid');
  return settling ? { ...attempt, status: 'pending' } : attempt;
}
