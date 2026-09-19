import { vi } from 'vitest';

const redis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  ping: vi.fn(),
  info: vi.fn(),
  dbsize: vi.fn(),
  flushdb: vi.fn(),
};

export const isRedisAvailable = true;

export default redis;
