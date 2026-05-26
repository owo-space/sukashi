import { cn } from "@/lib/utils";

/**
 * Legacy tri-color liveness dot — pure 8px circle, no inline text. The
 * text shows in `title` on hover only.
 *
 *   0  →  red    离线/未连接 (no pull check in the last 5 min)
 *   1  →  yellow 已连接,无流量上报
 *   2  →  green  正常运行
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
      title={label}
      className={cn("inline-block size-2 rounded-full align-middle", color, className)}
    />
  );
}
