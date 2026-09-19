import { describe, it, expect } from 'vitest';
import { computeShippingCost, FREE_SHIPPING_THRESHOLD, SHIPPING_COSTS } from './shipping.js';

const items = (ids: string[]) => ids.map((productId) => ({ productId, quantity: 1, price: 1000 }));

describe('computeShippingCost', () => {
  it('charges the standard flat rate below the free-shipping threshold', () => {
    expect(computeShippingCost('standard', 50_000, new Set(), items(['p1']))).toBe(SHIPPING_COSTS.standard);
  });

  it('charges the express flat rate for express delivery', () => {
    expect(computeShippingCost('express', 50_000, new Set(), items(['p1']))).toBe(SHIPPING_COSTS.express);
  });

  it('is free for pickup (retrait)', () => {
    expect(computeShippingCost('retrait', 50_000, new Set(), items(['p1']))).toBe(0);
  });

  it('is free once the subtotal reaches the threshold', () => {
    expect(computeShippingCost('standard', FREE_SHIPPING_THRESHOLD, new Set(), items(['p1']))).toBe(0);
  });

  it('is free when the cart contains a freeShipping product, even for express and below threshold', () => {
    expect(
      computeShippingCost('express', 10_000, new Set(['p2']), items(['p1', 'p2'])),
    ).toBe(0);
  });

  it('applies normal rules when no cart item is flagged freeShipping', () => {
    expect(
      computeShippingCost('standard', 10_000, new Set(['other-product']), items(['p1', 'p2'])),
    ).toBe(SHIPPING_COSTS.standard);
  });
});
