import { cn } from "@/lib/utils";

/**
 * Mirrors the legacy panel's tri-color liveness dot.
 *
 *   0  →  red    离线/未连接 (no pull check in the last 5 min)
 *   1  →  yellow 已连接但无流量上报 (controller pulled but no traffic push)
 *   2  →  green  正常运行 (actively pushing traffic)
 *
 * Falls back to red for null/undefined.
 */
export function NodeStatusDot({
  availableStatus,
  isOnline,
  className
}: {
  availableStatus?: number | null;
  isOnline?: number | boolean | null;
  className?: string;
}) {
  // Allow callers that only have legacy is_online to still render something.
  const status =
    availableStatus == null
      ? isOnline
        ? 2
        : 0
      : Number(availableStatus);
  const label = status === 2 ? "正常运行" : status === 1 ? "已连接(无流量)" : "离线";
  const color =
    status === 2
      ? "bg-emerald-500"
      : status === 1
        ? "bg-amber-400"
        : "bg-rose-500";
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", className)}
      title={label}
    >
      <span
        className={cn("inline-block size-2.5 rounded-full ring-2 ring-offset-1", color)}
        style={{
          boxShadow:
            status === 2
              ? "0 0 6px color-mix(in oklab, var(--color-emerald-500) 70%, transparent)"
              : status === 1
                ? "0 0 6px color-mix(in oklab, var(--color-amber-400) 70%, transparent)"
                : "0 0 6px color-mix(in oklab, var(--color-rose-500) 70%, transparent)"
        }}
      />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
