import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { RedisService } from "../database/redis.service.js";
import { unixNow } from "../common/unix.js";
import {
  SETTING_DEFAULTS,
  SETTING_ENV_OVERRIDES,
  SETTING_GROUPS
} from "./settings.defaults.js";

const RELOAD_CHANNEL = "sukashi:settings:reload";

type SettingValue = unknown;

function parseEnvValue(raw: string, defaultValue: SettingValue): SettingValue {
  const trimmed: string = raw;
  if (trimmed === "") return defaultValue;
  if (typeof defaultValue === "number") {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : defaultValue;
  }
  if (typeof defaultValue === "boolean") {
    const lower = trimmed.toLowerCase();
    return ["1", "true", "yes", "on"].includes(lower);
  }
  if (Array.isArray(defaultValue)) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // fall through to comma-split
    }
    return trimmed
      .split(",")
      .map((item: string) => item.trim())
      .filter(Boolean);
  }
  return trimmed;
}

@Injectable()
export class SettingsService implements OnModuleInit {
  private readonly logger = new Logger(SettingsService.name);
  private readonly cache = new Map<string, SettingValue>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
    // Subscribe peer instances: when one panel writes config, the others
    // refresh their in-memory cache without needing a restart.
    await this.redis.subscriber.subscribe(RELOAD_CHANNEL);
    this.redis.subscriber.on("message", (channel: string) => {
      if (channel !== RELOAD_CHANNEL) return;
      this.reload().catch((error) => {
        this.logger.error(`settings reload failed: ${(error as Error).message}`);
      });
    });
  }

  /**
   * Read every row from v2_settings into the in-memory cache. Called on
   * boot and after each `save()` so reads stay synchronous.
   */
  async reload(): Promise<void> {
    const rows = await this.prisma.setting.findMany();
    this.cache.clear();
    for (const row of rows) {
      this.cache.set(row.key, this.deserialize(row.value));
    }
  }

  get<T = SettingValue>(key: string, fallback?: T): T {
    if (this.cache.has(key)) return this.cache.get(key) as T;
    const envKey = SETTING_ENV_OVERRIDES[key];
    if (envKey && process.env[envKey] !== undefined) {
      return parseEnvValue(String(process.env[envKey] ?? ""), SETTING_DEFAULTS[key]) as T;
    }
    if (key in SETTING_DEFAULTS) return SETTING_DEFAULTS[key] as T;
    return fallback as T;
  }

  getInt(key: string, fallback = 0): number {
    const value: unknown = this.get(key, fallback);
    if (typeof value === "number") return Math.trunc(value);
    if (typeof value === "boolean") return value ? 1 : 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
  }

  getString(key: string, fallback = ""): string {
    const value: unknown = this.get(key, fallback);
    if (value === null || value === undefined) return fallback;
    return String(value);
  }

  getBool(key: string, fallback = false): boolean {
    const value: unknown = this.get(key, fallback);
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const lower: string = value.toLowerCase();
      return ["1", "true", "yes", "on"].includes(lower);
    }
    return fallback;
  }

  getArray<T = unknown>(key: string, fallback: T[] = []): T[] {
    const value = this.get<unknown>(key, fallback);
    if (Array.isArray(value)) return value as T[];
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed as T[];
      } catch {
        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean) as unknown as T[];
      }
    }
    return fallback;
  }

  /**
   * Persist a single key. Used by the admin config save endpoint.
   */
  async set(key: string, value: SettingValue): Promise<void> {
    const now = unixNow();
    const serialized = this.serialize(value);
    await this.prisma.setting.upsert({
      where: { key },
      update: { value: serialized, updatedAt: now },
      create: { key, value: serialized, createdAt: now, updatedAt: now }
    });
    this.cache.set(key, value);
  }

  async setMany(entries: Record<string, SettingValue>): Promise<void> {
    await Promise.all(Object.entries(entries).map(([key, value]) => this.set(key, value)));
    // Tell peers to refresh. Local cache is already up to date via set().
    await this.redis.client.publish(RELOAD_CHANNEL, String(unixNow()));
  }

  /**
   * Returns the full config tree shaped like PHP's ConfigController.fetch.
   */
  fetchGrouped(): Record<string, Record<string, SettingValue>> {
    const grouped: Record<string, Record<string, SettingValue>> = {};
    for (const [group, keys] of Object.entries(SETTING_GROUPS)) {
      grouped[group] = {};
      for (const key of keys) {
        grouped[group]![key] = this.get(key);
      }
    }
    return grouped;
  }

  /**
   * The :adminPath route parameter must equal this value. Falls back to a
   * deterministic-ish placeholder so a fresh install isn't completely open.
   */
  getAdminPath(): string {
    return this.getString("secure_path", "admin");
  }

  private serialize(value: SettingValue): string | null {
    if (value === null || value === undefined) return null;
    return JSON.stringify(value);
  }

  private deserialize(value: string | null): SettingValue {
    if (value === null) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
