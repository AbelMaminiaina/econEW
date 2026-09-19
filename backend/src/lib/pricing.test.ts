import { describe, it, expect } from 'vitest';
import { resolveUnitPrice } from './pricing.js';

describe('resolveUnitPrice', () => {
  it('falls back to the base price when there are no tiers', () => {
    expect(resolveUnitPrice(1000, [], 5)).toBe(1000);
  });

  it('falls back to the base price when the quantity is below every tier', () => {
    const tiers = [{ minQty: 10, unitPrice: 900 }, { minQty: 50, unitPrice: 800 }];
    expect(resolveUnitPrice(1000, tiers, 5)).toBe(1000);
  });

  it('picks the tier matching the quantity exactly', () => {
    const tiers = [{ minQty: 10, unitPrice: 900 }, { minQty: 50, unitPrice: 800 }];
    expect(resolveUnitPrice(1000, tiers, 10)).toBe(900);
  });

  it('picks the highest applicable tier when quantity exceeds several thresholds', () => {
    const tiers = [{ minQty: 10, unitPrice: 900 }, { minQty: 50, unitPrice: 800 }];
    expect(resolveUnitPrice(1000, tiers, 100)).toBe(800);
  });

  it('is unaffected by tier declaration order', () => {
    const tiers = [{ minQty: 50, unitPrice: 800 }, { minQty: 10, unitPrice: 900 }];
    expect(resolveUnitPrice(1000, tiers, 60)).toBe(800);
  });
});
