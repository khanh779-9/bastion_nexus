/**
 * Bastion Nexus — Redis-backed Rate Limiting
 * Thay thế in-memory Map bằng Redis INCR + EXPIRE
 */
import type { Request, Response, NextFunction } from 'express';
import { getRedis } from '../lib/redis.js';

interface RateLimitConfig {
  max: number;
  windowSeconds: number;
}

const LIMITS: Record<string, RateLimitConfig> = {
  auth: { max: 50, windowSeconds: 15 * 60 },   // 50 lần / 15 phút
  api: { max: 500, windowSeconds: 60 },          // 500 lần / 1 phút
};

// Fallback in-memory khi Redis chưa sẵn sàng
const memoryStore = new Map<string, { count: number; resetAt: number }>();

async function redisRateCheck(key: string, limit: RateLimitConfig): Promise<{ allowed: boolean; retryAfter: number }> {
  try {
    const redis = getRedis();
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, limit.windowSeconds);
    }

    if (current > limit.max) {
      const ttl = await redis.ttl(key);
      return { allowed: false, retryAfter: ttl > 0 ? ttl : limit.windowSeconds };
    }

    return { allowed: true, retryAfter: 0 };
  } catch {
    // Fallback in-memory nếu Redis lỗi
    return memoryRateCheck(key, limit);
  }
}

function memoryRateCheck(key: string, limit: RateLimitConfig): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let record = memoryStore.get(key);

  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + limit.windowSeconds * 1000 };
    memoryStore.set(key, record);
    return { allowed: true, retryAfter: 0 };
  }

  record.count++;

  if (record.count > limit.max) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, retryAfter: 0 };
}

export function rateLimit(endpoint: string = 'api') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const limit = LIMITS[endpoint] ?? LIMITS.api;
    const identifier = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const key = `rl:${endpoint}:${identifier}`;

    const { allowed, retryAfter } = await redisRateCheck(key, limit);

    if (!allowed) {
      res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter,
      });
      return;
    }

    next();
  };
}
