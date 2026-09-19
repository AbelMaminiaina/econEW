import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, signToken, verifyToken } from './auth.js';

describe('password hashing', () => {
  it('hashes a password so it no longer matches the plaintext', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(hash).not.toBe('correct-horse-battery-staple');
  });

  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await comparePassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('correct-horse-battery-staple');
    expect(await comparePassword('wrong-password', hash)).toBe(false);
  });
});

describe('JWT sign/verify', () => {
  it('round-trips the payload', () => {
    const payload = { userId: 'u1', role: 'buyer' as const, companyId: 'c1' };
    const token = signToken(payload);
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe('u1');
    expect(decoded.role).toBe('buyer');
    expect(decoded.companyId).toBe('c1');
  });

  it('throws on a tampered token', () => {
    const token = signToken({ userId: 'u1', role: 'buyer' as const, companyId: null });
    expect(() => verifyToken(token + 'tampered')).toThrow();
  });
});
