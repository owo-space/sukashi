import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { RedisService } from "../database/redis.service.js";

@Injectable()
export class QuickLoginService {
  constructor(private readonly redis: RedisService) {}

  async issue(userId: number, ttlSeconds = 60): Promise<string> {
    const code = `${Date.now().toString(36)}${randomBytes(6).toString("hex")}`;
    await this.redis.client.set(
      `quick:login:${code}`,
      String(userId),
      "EX",
      ttlSeconds
    );
    return code;
  }

  async consume(code: string): Promise<number | null> {
    const key = `quick:login:${code}`;
    const userId = await this.redis.client.get(key);
    if (!userId) return null;
    await this.redis.client.del(key);
    const parsed = Number(userId);
    return Number.isInteger(parsed) ? parsed : null;
  }
}
