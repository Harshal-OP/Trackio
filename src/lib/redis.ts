import Redis from 'ioredis';

// Valkey is Redis-protocol compatible; keep REDIS_URL as backward-compatible fallback.
const CACHE_URL = process.env.VALKEY_URL || process.env.REDIS_URL || 'redis://localhost:6379';

interface RedisCache {
    client: Redis | null;
}

declare global {
    // eslint-disable-next-line no-var
    var redis: RedisCache | undefined;
}

const cached: RedisCache = global.redis || { client: null };

if (!global.redis) {
    global.redis = cached;
}

export function getRedis(): Redis {
    if (!cached.client) {
        cached.client = new Redis(CACHE_URL, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
        });
    }
    return cached.client;
}
