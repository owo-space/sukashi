/** camelCase → snake_case ("inviteUserId" → "invite_user_id"). */
function camelToSnake(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

/**
 * Deep walk a value, BigInts → number/string, Dates → ISO string, all
 * object keys camelCase → snake_case. Arrays / primitives passed through.
 *
 * Use this on every `dataResponse(...)` payload that originates from
 * Prisma. The legacy V2Board panel (and our shadcn-v1 SPA) expects
 * snake_case across the board — trade_no, total_amount, created_at,
 * invite_user_id, etc. Without this transform the SPA reads undefined.
 */
function isDecimalLike(value: object): boolean {
  // Prisma.Decimal serializes its internals as { s, e, d: number[] } when
  // walked with Object.entries — detect that shape (or any object with the
  // Decimal-style toFixed method) and stringify it instead of recursing.
  if (typeof (value as { toFixed?: unknown }).toFixed === "function") {
    const ctor = (value as { constructor?: { name?: string } }).constructor?.name;
    if (ctor === "Decimal") return true;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.s === "number" &&
    typeof obj.e === "number" &&
    Array.isArray(obj.d) &&
    Object.keys(obj).length <= 4
  );
}

function transform(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(transform);
  if (typeof value === "object") {
    if (isDecimalLike(value)) return String(value);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[camelToSnake(k)] = transform(v);
    }
    return out;
  }
  return value;
}

export function toJsonSafe<T>(value: T): T {
  return transform(value) as T;
}

export function dataResponse<T>(data: T) {
  return {
    data: toJsonSafe(data),
    code: 200,
    message: ""
  };
}
