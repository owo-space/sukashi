export function asBoolean(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }
  return false;
}

export function asNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function asNullableString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

export function asBigInt(value: unknown, fallback = 0): bigint {
  if (value === undefined || value === null || value === "") return BigInt(fallback);
  return BigInt(Math.round(Number(value)));
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value === undefined || value === null || value === "") return [];
  if (typeof value === "number") return [String(value)];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function firstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return first === undefined ? undefined : String(first);
  }
  if (value === undefined || value === null) return undefined;
  return String(value);
}

export function firstQueryNumber(value: unknown, fallback: number): number {
  const item = firstQueryValue(value);
  if (item === undefined || item === "") return fallback;
  const parsed = Number(item);
  return Number.isFinite(parsed) ? parsed : fallback;
}
