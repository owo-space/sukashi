import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";

dayjs.extend(relativeTime);

const GIB = 1024 ** 3;

export function bytesToGB(bytes: number | string | bigint | null | undefined): number {
  if (bytes === null || bytes === undefined) return 0;
  const n = typeof bytes === "bigint" ? Number(bytes) : Number(bytes);
  if (!Number.isFinite(n)) return 0;
  return n / GIB;
}

export function formatBytes(bytes: number | string | bigint | null | undefined): string {
  const gb = bytesToGB(bytes);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = Number(bytes ?? 0) / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = Number(bytes ?? 0) / 1024;
  return `${kb.toFixed(2)} KB`;
}

export function formatCents(cents: number | null | undefined, currencySymbol = "¥"): string {
  const n = Number(cents ?? 0) / 100;
  return `${currencySymbol}${n.toFixed(2)}`;
}

export function formatUnix(unix: number | null | undefined, pattern = "YYYY-MM-DD HH:mm"): string {
  if (!unix) return "-";
  return dayjs.unix(unix).format(pattern);
}

export function formatRelative(unix: number | null | undefined): string {
  if (!unix) return "-";
  return dayjs.unix(unix).fromNow();
}

/**
 * V2Board convention: expired_at = null OR <=0 → "长期" (lifetime).
 */
export function formatExpiry(unix: number | null | undefined): string {
  if (unix === null || unix === undefined || Number(unix) <= 0) return "长期有效";
  return formatUnix(unix);
}

export function truncate(text: string, max = 64): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
