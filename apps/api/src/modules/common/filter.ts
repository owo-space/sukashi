import type { Prisma } from "@prisma/client";

export type RawFilterItem = {
  key?: unknown;
  condition?: unknown;
  value?: unknown;
};

const STRING_CONDITIONS = new Set(["like", "ilike", "starts_with", "ends_with", "contains", "not_contains"]);
const COMPARE_CONDITIONS = new Set(["=", "!=", "<>", "<", "<=", ">", ">=", "in", "not_in"]);
const TRAFFIC_KEYS = new Set(["d", "u", "transfer_enable"]);
const KEY_REWRITES: Record<string, string> = {
  d: "d",
  u: "u",
  transfer_enable: "transferEnable",
  plan_id: "planId",
  group_id: "groupId",
  is_admin: "isAdmin",
  is_staff: "isStaff",
  invite_user_id: "inviteUserId",
  created_at: "createdAt",
  updated_at: "updatedAt",
  last_login_at: "lastLoginAt",
  expired_at: "expiredAt"
};

const GIB = 1024 ** 3;

function snakeToCamel(key: string): string {
  if (KEY_REWRITES[key]) return KEY_REWRITES[key];
  return key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function coerceValue(key: string, condition: string, raw: unknown): unknown {
  if (raw === undefined || raw === null) return raw;
  if (TRAFFIC_KEYS.has(key)) {
    return BigInt(Math.round(Number(raw) * GIB));
  }
  if (key === "expired_at" || key === "last_login_at" || key === "created_at" || key === "updated_at") {
    return Number(raw);
  }
  if (typeof raw === "string" && raw.trim() !== "" && !Number.isNaN(Number(raw))) {
    if (condition === "like" || condition === "ilike" || condition === "contains") {
      return raw;
    }
    return key.endsWith("_id") || key === "id" || key === "planId" || key === "groupId"
      ? Number(raw)
      : raw;
  }
  return raw;
}

function buildPrismaCondition(
  rawCondition: unknown,
  rawValue: unknown,
  key: string
): { field: string; condition: Prisma.StringFilter | Prisma.IntFilter | Prisma.BigIntFilter | unknown } | null {
  let condition = String(rawCondition ?? "=").trim();
  const value = coerceValue(key, condition, rawValue);
  if (value === undefined) return null;

  if (condition === "模糊") condition = "ilike";
  if (condition === "like") condition = "ilike";

  const field = snakeToCamel(key);

  if (STRING_CONDITIONS.has(condition)) {
    const pattern = String(value).replace(/^%+|%+$/g, "");
    if (condition === "starts_with") return { field, condition: { startsWith: pattern, mode: "insensitive" } };
    if (condition === "ends_with") return { field, condition: { endsWith: pattern, mode: "insensitive" } };
    if (condition === "not_contains") return { field, condition: { not: { contains: pattern, mode: "insensitive" } } };
    return { field, condition: { contains: pattern, mode: "insensitive" } };
  }

  if (COMPARE_CONDITIONS.has(condition)) {
    switch (condition) {
      case "=":
        return { field, condition: value };
      case "!=":
      case "<>":
        return { field, condition: { not: value } };
      case "<":
        return { field, condition: { lt: value } };
      case "<=":
        return { field, condition: { lte: value } };
      case ">":
        return { field, condition: { gt: value } };
      case ">=":
        return { field, condition: { gte: value } };
      case "in":
        return { field, condition: { in: Array.isArray(value) ? value : [value] } };
      case "not_in":
        return { field, condition: { notIn: Array.isArray(value) ? value : [value] } };
    }
  }

  return { field, condition: value };
}

export type UserFilterContext = {
  resolveInviteUserId: (emailCondition: string, emailValue: string) => Promise<number>;
};

/**
 * V2Board admin pages send a `filter` array with `{ key, condition, value }` triples.
 * Translates that into a Prisma user WHERE object, preserving the same coercion rules
 * (traffic keys multiplied by GiB, 模糊→ilike, plan_id="null"→whereNull, etc.).
 */
export async function buildUserFilterWhere(
  filters: unknown,
  context: UserFilterContext
): Promise<Prisma.UserWhereInput> {
  if (!Array.isArray(filters) || filters.length === 0) return {};
  const where: Prisma.UserWhereInput = {};
  const andClauses: Prisma.UserWhereInput[] = [];

  for (const raw of filters as RawFilterItem[]) {
    if (!raw || typeof raw !== "object") continue;
    const key = String(raw.key ?? "").trim();
    if (!key) continue;

    if (key === "invite_by_email") {
      const inviteEmail = String(raw.value ?? "").trim();
      const inviteUserId = await context.resolveInviteUserId(
        String(raw.condition ?? "="),
        inviteEmail
      );
      andClauses.push({ inviteUserId });
      continue;
    }

    if (key === "plan_id" && String(raw.value ?? "") === "null") {
      andClauses.push({ planId: null });
      continue;
    }

    const condition = buildPrismaCondition(raw.condition, raw.value, key);
    if (!condition) continue;
    andClauses.push({ [condition.field]: condition.condition } as Prisma.UserWhereInput);
  }

  if (andClauses.length > 0) where.AND = andClauses;
  return where;
}

export function parseSortType(value: unknown): "asc" | "desc" {
  const normalized = String(value ?? "DESC").toUpperCase();
  return normalized === "ASC" ? "asc" : "desc";
}

const VALID_SORT_FIELDS = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "expiredAt",
  "lastLoginAt",
  "balance",
  "commissionBalance",
  "u",
  "d",
  "transferEnable",
  "email"
]);

export function parseSortField(value: unknown, fallback = "createdAt"): string {
  if (!value) return fallback;
  const field = snakeToCamel(String(value));
  return VALID_SORT_FIELDS.has(field) ? field : fallback;
}
