import { Injectable } from "@nestjs/common";
import { RedisService } from "../database/redis.service.js";
import { unixNow } from "../common/unix.js";

const STATUS_TTL_SECONDS = 24 * 3600;
const ACTIVE_WINDOW_SECONDS = 300;

export type NodeRuntimeStatus = {
  lastCheckAt: number;
  lastPushAt: number;
  online: number;
  availableStatus: number;
};

/**
 * Tracks per-node liveness (pull check + push traffic) in Redis so multiple
 * panel instances share the same view. availableStatus: 0=offline,
 * 1=checked-in but no traffic, 2=actively pushing.
 */
@Injectable()
export class NodeStatusService {
  constructor(private readonly redis: RedisService) {}

  async touchCheck(nodeId: number): Promise<void> {
    const key = this.key(nodeId);
    await this.redis.client.hset(key, "lastCheckAt", String(unixNow()));
    await this.redis.client.expire(key, STATUS_TTL_SECONDS);
  }

  async touchPush(nodeId: number, online: number): Promise<void> {
    const key = this.key(nodeId);
    const now = String(unixNow());
    await this.redis.client.hset(key, {
      lastPushAt: now,
      online: String(online)
    });
    await this.redis.client.expire(key, STATUS_TTL_SECONDS);
  }

  async resolve(nodeId: number): Promise<NodeRuntimeStatus> {
    const raw = await this.redis.client.hgetall(this.key(nodeId));
    const lastCheckAt = Number(raw.lastCheckAt ?? 0);
    const lastPushAt = Number(raw.lastPushAt ?? 0);
    const online = Number(raw.online ?? 0);
    const now = unixNow();
    const availableStatus =
      now - lastCheckAt >= ACTIVE_WINDOW_SECONDS
        ? 0
        : now - lastPushAt >= ACTIVE_WINDOW_SECONDS
          ? 1
          : 2;
    return { lastCheckAt, lastPushAt, online, availableStatus };
  }

  private key(nodeId: number): string {
    return `node:status:${nodeId}`;
  }
}
