import { Redis as UpstashRedis } from '@upstash/redis';
import IORedis from 'ioredis';

// Use Upstash REST API in production, ioredis locally
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const isUpstash = Boolean(upstashUrl && upstashToken);

console.log('Redis config:', {
  isUpstash,
  hasUpstashUrl: Boolean(upstashUrl),
  hasUpstashToken: Boolean(upstashToken),
  nodeEnv: process.env.NODE_ENV,
});

let upstashClient: UpstashRedis | null = null;
let ioredisClient: IORedis | null = null;

if (isUpstash) {
  upstashClient = new UpstashRedis({
    url: upstashUrl!,
    token: upstashToken!,
  });
  console.log('Using Upstash Redis (REST API)');
} else if (process.env.REDIS_URL || process.env.NODE_ENV !== 'production') {
  const redisUrl = process.env.REDIS_URL || 'redis://:redis123@localhost:6380';
  ioredisClient = new IORedis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  ioredisClient.on('connect', () => {
    console.log('Redis connected successfully');
  });

  ioredisClient.on('error', (err) => {
    console.error('Redis connection error:', err.message);
  });
} else {
  console.log('No Redis configured - cache disabled');
}

// Check if Redis is available
export const isRedisAvailable = Boolean(upstashClient || ioredisClient);

// Unified interface
export const redis = {
  async get(key: string): Promise<string | null> {
    if (!isRedisAvailable) return null;
    if (upstashClient) {
      return await upstashClient.get(key);
    }
    return await ioredisClient!.get(key);
  },

  async set(key: string, value: string, options?: { ex?: number }): Promise<void> {
    if (!isRedisAvailable) return;
    if (upstashClient) {
      if (options?.ex) {
        await upstashClient.set(key, value, { ex: options.ex });
      } else {
        await upstashClient.set(key, value);
      }
    } else {
      if (options?.ex) {
        await ioredisClient!.set(key, value, 'EX', options.ex);
      } else {
        await ioredisClient!.set(key, value);
      }
    }
  },

  async del(key: string): Promise<void> {
    if (!isRedisAvailable) return;
    if (upstashClient) {
      await upstashClient.del(key);
    } else {
      await ioredisClient!.del(key);
    }
  },

  async keys(pattern: string): Promise<string[]> {
    if (!isRedisAvailable) return [];
    if (upstashClient) {
      return await upstashClient.keys(pattern);
    }
    return await ioredisClient!.keys(pattern);
  },

  async ping(): Promise<string> {
    if (!isRedisAvailable) {
      throw new Error('Redis not configured');
    }
    if (upstashClient) {
      return await upstashClient.ping();
    }
    return await ioredisClient!.ping();
  },

  async info(section?: string): Promise<string> {
    if (!isRedisAvailable) return 'Redis not configured';
    if (upstashClient) {
      return 'Upstash REST API - INFO not available';
    }
    if (section) {
      return await ioredisClient!.info(section);
    }
    return await ioredisClient!.info();
  },

  async dbsize(): Promise<number> {
    if (!isRedisAvailable) return 0;
    if (upstashClient) {
      return await upstashClient.dbsize();
    }
    return await ioredisClient!.dbsize();
  },

  async flushdb(): Promise<void> {
    if (!isRedisAvailable) return;
    if (upstashClient) {
      await upstashClient.flushdb();
    } else {
      await ioredisClient!.flushdb();
    }
  },
};

export async function connectRedis(): Promise<void> {
  if (ioredisClient) {
    try {
      await ioredisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
    }
  }
}

export default redis;
