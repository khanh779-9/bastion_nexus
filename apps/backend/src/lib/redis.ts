/**
 * Bastion Nexus — Redis Client
 * Tự nhận diện Upstash (production) hoặc local Docker
 */
import { Redis } from 'ioredis';
import { config } from '../config/index.js';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (redis) return redis;

  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null, // BullMQ requirement
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      console.log(`[Redis] Reconnecting... attempt ${times}, delay ${delay}ms`);
      return delay;
    },
    lazyConnect: false,
  });

  redis.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  redis.on('error', (err: any) => {
    console.error('[Redis] Connection error:', err.message);
  });

  return redis;
}

// ─── Cache helpers ───

/** Lấy cache, trả về null nếu không có */
export async function cacheGet(key: string): Promise<string | null> {
  try {
    return await getRedis().get(key);
  } catch {
    return null;
  }
}

/** Lưu cache với TTL (giây) */
export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  try {
    await getRedis().setex(key, ttlSeconds, value);
  } catch (err) {
    console.error('[Redis] Cache set error:', err);
  }
}

/** Xóa cache */
export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch (err) {
    console.error('[Redis] Cache del error:', err);
  }
}

/** Lấy cache đã parse JSON */
export async function cacheGetJSON<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Lưu cache dạng JSON */
export async function cacheSetJSON(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSeconds);
}

/** Đóng kết nối Redis */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export default getRedis;
