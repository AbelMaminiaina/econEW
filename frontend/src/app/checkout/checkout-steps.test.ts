import { describe, it, expect } from 'vitest';
import { filterCheckoutSteps, type CheckoutStepId } from './checkout-steps';

const steps: { id: CheckoutStepId }[] = [
  { id: 'adresse' },
  { id: 'livraison' },
  { id: 'confirmation' },
];

describe('filterCheckoutSteps', () => {
  it('garde toutes les étapes quand aucun produit n’est en livraison offerte', () => {
    expect(filterCheckoutSteps(steps, false).map((s) => s.id)).toEqual([
      'adresse',
      'livraison',
      'confirmation',
    ]);
  });

  it('retire l’étape « livraison » quand le panier a un produit en livraison offerte', () => {
    expect(filterCheckoutSteps(steps, true).map((s) => s.id)).toEqual([
      'adresse',
      'confirmation',
    ]);
  });

  it('ne mute pas le tableau d’origine', () => {
    filterCheckoutSteps(steps, true);
    expect(steps).toHaveLength(3);
  });
});
