import { Injectable } from "@nestjs/common";
import { randomInt } from "node:crypto";
import { RedisService } from "../database/redis.service.js";

const OTP_TTL_SECONDS = 5 * 60;

@Injectable()
export class EmailOtpService {
  constructor(private readonly redis: RedisService) {}

  async issue(email: string): Promise<string> {
    const code = String(randomInt(100000, 999999));
    await this.redis.client.set(
      `otp:email:${email.toLowerCase()}`,
      code,
      "EX",
      OTP_TTL_SECONDS
    );
    return code;
  }

  /**
   * Single-use: deletes the key on successful match so a replay against the
   * same code can't pass twice.
   */
  async verify(email: string, code: string): Promise<boolean> {
    const key = `otp:email:${email.trim().toLowerCase()}`;
    const stored = await this.redis.client.get(key);
    if (!stored) return false;
    if (stored !== String(code ?? "").trim()) return false;
    await this.redis.client.del(key);
    return true;
  }
}
