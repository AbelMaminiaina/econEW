import { describe, it, expect } from 'vitest';
import {
  formatQuantity,
  cn,
  formatPrice,
  formatDate,
  slugify,
  truncate,
  calculateReadingTime,
  getProductivityLabel,
  getProductivityColor,
  getCategoryLabel,
  resolveUnitPrice,
  getBadgeLabel,
  generateOrderId,
  validateEmail,
  validatePhone,
  validatePostalCode,
  getDeliveryEstimate,
  getShippingCost,
  formatWeight,
  isUpcoming,
  formatDeliveryWindow,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COSTS,
} from './utils';

describe('cn', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b');
  });
});

describe('formatPrice', () => {
  it('formats an integer amount with an Ar suffix and no decimals', () => {
    expect(formatPrice(15000)).toMatch(/^15\s000\sAr$/);
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toMatch(/^0\sAr$/);
  });
});

describe('formatDate', () => {
  it('formats a date string in long French format', () => {
    expect(formatDate('2026-01-15')).toBe('15 janvier 2026');
  });

  it('accepts a Date instance', () => {
    expect(formatDate(new Date('2026-12-25'))).toBe('25 décembre 2026');
  });
});

describe('slugify', () => {
  it('lowercases, strips accents and replaces spaces with dashes', () => {
    expect(slugify('Œufs Fécondés à Vendre')).toBe('ufs-fecondes-a-vendre');
  });

  it('collapses consecutive separators and trims leading/trailing dashes', () => {
    expect(slugify('  Hello,   World!  ')).toBe('hello-world');
  });
});

describe('truncate', () => {
  it('returns the text unchanged when shorter than the limit', () => {
    expect(truncate('short', 10)).toBe('short');
  });

  it('truncates and appends an ellipsis when longer than the limit', () => {
    expect(truncate('a long piece of text', 6)).toBe('a long...');
  });
});

describe('calculateReadingTime', () => {
  it('rounds up to the nearest minute at 200 words per minute', () => {
    const content = Array(250).fill('mot').join(' ');
    expect(calculateReadingTime(content)).toBe(2);
  });

  it('returns at least 1 minute for short content', () => {
    expect(calculateReadingTime('quelques mots')).toBe(1);
  });
});

describe('getProductivityLabel', () => {
  it('translates a known productivity level', () => {
    expect(getProductivityLabel('élevée')).toBe('Élevée');
  });

  it('falls back to the raw value for unknown levels', () => {
    expect(getProductivityLabel('inconnue')).toBe('inconnue');
  });
});

describe('getProductivityColor', () => {
  it('returns the color class for a known level', () => {
    expect(getProductivityColor('faible')).toBe('bg-yellow-200');
  });

  it('falls back to gray for unknown levels', () => {
    expect(getProductivityColor('inconnue')).toBe('bg-gray-300');
  });
});

describe('getCategoryLabel', () => {
  it('normalizes dashes to underscores before lookup', () => {
    expect(getCategoryLabel('ordinateurs')).toBe('Ordinateurs & Écrans');
  });

  it('resolves an underscore category directly', () => {
    expect(getCategoryLabel('electronique')).toBe('Électronique & Photo');
  });

  it('falls back to the raw value for unknown categories', () => {
    expect(getCategoryLabel('inconnu')).toBe('inconnu');
  });
});

describe('getBadgeLabel', () => {
  it('translates a known badge', () => {
    expect(getBadgeLabel('plein_air')).toBe('Plein air');
  });

  it('falls back to the raw value for unknown badges', () => {
    expect(getBadgeLabel('inconnu')).toBe('inconnu');
  });
});

describe('generateOrderId', () => {
  it('produces an uppercase id prefixed with FDV-', () => {
    const id = generateOrderId();
    expect(id).toMatch(/^FDV-[0-9A-Z]+-[0-9A-Z]+$/);
  });

  it('produces distinct ids across calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateOrderId()));
    expect(ids.size).toBe(20);
  });
});

describe('validateEmail', () => {
  it('accepts a well-formed email', () => {
    expect(validateEmail('jean@example.com')).toBe(true);
  });

  it.each(['not-an-email', 'missing@domain', '@nouser.com', 'spaces in@email.com'])(
    'rejects %s',
    (value) => {
      expect(validateEmail(value)).toBe(false);
    }
  );
});

describe('validatePhone', () => {
  it('accepts a French mobile number in national format', () => {
    expect(validatePhone('06 12 34 56 78')).toBe(true);
  });

  it('accepts an international +33 format', () => {
    expect(validatePhone('+33 6 12 34 56 78')).toBe(true);
  });

  it('rejects an obviously invalid number', () => {
    expect(validatePhone('123')).toBe(false);
  });
});

describe('validatePostalCode', () => {
  it('accepts a 5-digit code', () => {
    expect(validatePostalCode('75001')).toBe(true);
  });

  it('rejects a code with the wrong length', () => {
    expect(validatePostalCode('750')).toBe(false);
  });

  it('rejects a code with non-digit characters', () => {
    expect(validatePostalCode('7500A')).toBe(false);
  });
});

describe('getDeliveryEstimate', () => {
  it('returns the estimate for a known method', () => {
    expect(getDeliveryEstimate('express')).toBe('1-2 jours ouvrés');
  });

  it('returns an empty string for an unknown method', () => {
    expect(getDeliveryEstimate('drone')).toBe('');
  });
});

describe('getShippingCost', () => {
  const below = FREE_SHIPPING_THRESHOLD - 1;

  it('charges standard shipping below the free-shipping threshold', () => {
    expect(getShippingCost('standard', below)).toBe(SHIPPING_COSTS.standard);
  });

  it('charges express shipping below the free-shipping threshold', () => {
    expect(getShippingCost('express', below)).toBe(SHIPPING_COSTS.express);
  });

  it('is free for pickup regardless of subtotal', () => {
    expect(getShippingCost('retrait', 1000)).toBe(0);
  });

  it('is free once the subtotal reaches the free-shipping threshold', () => {
    expect(getShippingCost('express', FREE_SHIPPING_THRESHOLD)).toBe(0);
  });

  it('defaults to 0 for an unknown method', () => {
    expect(getShippingCost('drone', 1000)).toBe(0);
  });

  it('is free when the cart holds a freeShipping item, ignoring method and threshold', () => {
    expect(getShippingCost('express', 1000, true)).toBe(0);
  });

  it('still charges normally when no cart item is flagged freeShipping', () => {
    expect(getShippingCost('standard', below, false)).toBe(SHIPPING_COSTS.standard);
  });
});

describe('formatWeight', () => {
  it('formats a weight with the ≈ prefix and kg suffix', () => {
    expect(formatWeight(1.8)).toBe('≈ 1,8 kg');
  });

  it('drops trailing zeros', () => {
    expect(formatWeight(2)).toBe('≈ 2 kg');
  });
});

describe('isUpcoming', () => {
  it('is false for a null/undefined/empty date', () => {
    expect(isUpcoming(null)).toBe(false);
    expect(isUpcoming(undefined)).toBe(false);
    expect(isUpcoming('')).toBe(false);
  });

  it('is false for an invalid date string', () => {
    expect(isUpcoming('not-a-date')).toBe(false);
  });

  it('is true only for a date in the future', () => {
    expect(isUpcoming(new Date(Date.now() + 86400_000).toISOString())).toBe(true);
    expect(isUpcoming(new Date(Date.now() - 86400_000).toISOString())).toBe(false);
  });
});

describe('formatDeliveryWindow', () => {
  it('gives the availability day or the next day, same month', () => {
    expect(formatDeliveryWindow('2026-12-20')).toBe('20 ou 21 décembre 2026');
  });

  it('handles a month boundary', () => {
    expect(formatDeliveryWindow('2026-12-31')).toBe('31 décembre 2026 ou 1 janvier 2027');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatDeliveryWindow('not-a-date')).toBe('');
  });
});

describe('formatQuantity', () => {
  it('does not pluralise weight units', () => {
    expect(formatQuantity(90, 'kg')).toBe('90 kg');
  });

  it('adds (s) to countable units', () => {
    expect(formatQuantity(500, 'pièce')).toBe('500 pièce(s)');
    expect(formatQuantity(25, 'carton')).toBe('25 carton(s)');
  });
});

describe('resolveUnitPrice (paliers absents)', () => {
  it('retombe sur le prix de base quand les paliers sont absents', () => {
    expect(resolveUnitPrice(1000, undefined, 50)).toBe(1000);
    expect(resolveUnitPrice(1000, null, 50)).toBe(1000);
  });
});
