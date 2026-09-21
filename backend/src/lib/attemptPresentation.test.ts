import { describe, it, expect } from 'vitest';
import { presentedAttempt } from './attemptPresentation.js';

const attempt = (overrides: Partial<any> = {}) => ({ status: 'completed', updatedAt: new Date(), ...overrides });
const unpaid = { status: 'pending', paymentStatus: 'submitted' };
const paid = { status: 'processing', paymentStatus: 'paid' };
const cancelled = { status: 'cancelled', paymentStatus: 'awaiting' };

describe('presentedAttempt', () => {
  it('répond « en cours » tant que les commandes ne sont pas réglées (le client continue d’attendre)', () => {
    expect(presentedAttempt(attempt(), [unpaid, paid]).status).toBe('pending');
  });

  it('répond « completed » quand toutes les commandes sont payées', () => {
    expect(presentedAttempt(attempt(), [paid, paid]).status).toBe('completed');
  });

  it('ignore les commandes annulées', () => {
    expect(presentedAttempt(attempt(), [paid, cancelled]).status).toBe('completed');
  });

  it('ne masque plus rien au bout de 30 s pour ne jamais faire attendre le client indéfiniment', () => {
    const old = attempt({ updatedAt: new Date(Date.now() - 31_000) });
    expect(presentedAttempt(old, [unpaid]).status).toBe('completed');
  });

  it.each(['pending', 'failed', 'review'])('ne touche pas une tentative « %s »', (status) => {
    expect(presentedAttempt(attempt({ status }), [unpaid]).status).toBe(status);
  });

  it('ne modifie pas l’objet d’origine', () => {
    const original = attempt();
    presentedAttempt(original, [unpaid]);
    expect(original.status).toBe('completed');
  });
});
