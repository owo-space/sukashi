import { Injectable } from "@nestjs/common";
import { RedisService } from "../database/redis.service.js";

export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
};

/**
 * Sliding-window-ish counter built on Redis INCR + EXPIRE. The first hit in
 * a window sets the TTL; subsequent hits just bump the counter. When the
 * key TTL elapses the counter naturally rolls over (matches V2Board's
 * Laravel RateLimiter semantics).
 */
@Injectable()
export class RateLimitService {
  constructor(private readonly redis: RedisService) {}

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const redisKey = `rate:${key}`;
    const value = await this.redis.client.incr(redisKey);
    if (value === 1) {
      await this.redis.client.expire(redisKey, windowSeconds);
    }
    if (value > limit) {
      const ttl = await this.redis.client.ttl(redisKey);
      return { allowed: false, retryAfter: Math.max(ttl, 0) };
    }
    return { allowed: true, retryAfter: 0 };
  }

  async reset(key: string): Promise<void> {
    await this.redis.client.del(`rate:${key}`);
  }
}
