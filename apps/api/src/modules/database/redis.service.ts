import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Redis } from "ioredis";

/**
 * Wraps two ioredis connections — the "main" client for normal commands and
 * a dedicated "subscriber" client (ioredis requires this split: once a
 * connection enters subscribe mode, it can only run subscribe/unsubscribe
 * commands). Both connect lazily on first use; we still call `connect()`
 * eagerly during onModuleInit so misconfigured Redis surfaces at boot.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;
  readonly subscriber: Redis;

  constructor() {
    const url = process.env.REDIS_URL ?? "redis://redis:6379/0";
    const options = {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3
    };
    this.client = new Redis(url, options);
    this.subscriber = new Redis(url, options);
    for (const [tag, conn] of [
      ["main", this.client] as const,
      ["sub", this.subscriber] as const
    ]) {
      conn.on("error", (error: Error) => {
        this.logger.error(`redis ${tag} error: ${error.message}`);
      });
    }
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([this.client.connect(), this.subscriber.connect()]);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.client.quit(), this.subscriber.quit()]);
  }
}
