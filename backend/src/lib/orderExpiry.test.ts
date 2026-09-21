import { describe, it, expect, afterEach } from 'vitest';
import { DEFAULT_UNPAID_EXPIRY_HOURS, orderExpiresAt, unpaidOrderExpiryHours } from './orderExpiry.js';

const original = process.env.UNPAID_ORDER_EXPIRY_HOURS;
afterEach(() => {
  if (original === undefined) delete process.env.UNPAID_ORDER_EXPIRY_HOURS;
  else process.env.UNPAID_ORDER_EXPIRY_HOURS = original;
});

describe('unpaidOrderExpiryHours', () => {
  it('defaults to 48 hours', () => {
    delete process.env.UNPAID_ORDER_EXPIRY_HOURS;
    expect(unpaidOrderExpiryHours()).toBe(DEFAULT_UNPAID_EXPIRY_HOURS);
    expect(DEFAULT_UNPAID_EXPIRY_HOURS).toBe(48);
  });

  it('reads UNPAID_ORDER_EXPIRY_HOURS (comma decimal accepted)', () => {
    process.env.UNPAID_ORDER_EXPIRY_HOURS = '24';
    expect(unpaidOrderExpiryHours()).toBe(24);
    process.env.UNPAID_ORDER_EXPIRY_HOURS = '0,5';
    expect(unpaidOrderExpiryHours()).toBe(0.5);
  });

  it('0 disables the automatic cancellation', () => {
    process.env.UNPAID_ORDER_EXPIRY_HOURS = '0';
    expect(unpaidOrderExpiryHours()).toBe(0);
  });

  it.each(['abc', '-5', '99999', '   '])('falls back to 48 h for the invalid value %j', (value) => {
    process.env.UNPAID_ORDER_EXPIRY_HOURS = value;
    expect(unpaidOrderExpiryHours()).toBe(48);
  });
});

describe('orderExpiresAt', () => {
  const created = new Date('2026-09-20T10:00:00Z');
  const rejectedAt = new Date('2026-09-21T15:30:00Z');
  const base = { status: 'pending', paymentStatus: 'awaiting', createdAt: created, updatedAt: created };

  it('counts from the order creation for an order awaiting payment', () => {
    expect(orderExpiresAt(base, 48)).toEqual(new Date('2026-09-22T10:00:00Z'));
  });

  it('counts from the rejection for a refused payment (the customer gets a full new delay)', () => {
    expect(orderExpiresAt({ ...base, paymentStatus: 'rejected', updatedAt: rejectedAt }, 48)).toEqual(
      new Date('2026-09-23T15:30:00Z')
    );
  });

  it.each(['submitted', 'paid'])('has no deadline once the payment is %s', (paymentStatus) => {
    expect(orderExpiresAt({ ...base, paymentStatus }, 48)).toBeNull();
  });

  it.each(['cancelled', 'processing', 'shipped', 'delivered'])('has no deadline for an order that is %s', (status) => {
    expect(orderExpiresAt({ ...base, status }, 48)).toBeNull();
  });

  it('has no deadline when the automatic cancellation is disabled', () => {
    expect(orderExpiresAt(base, 0)).toBeNull();
  });

  it('uses the configured delay by default', () => {
    process.env.UNPAID_ORDER_EXPIRY_HOURS = '24';
    expect(orderExpiresAt(base)).toEqual(new Date('2026-09-21T10:00:00Z'));
  });
});
