import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  message = "暂无数据",
  className
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground",
        className
      )}
    >
      <Inbox className="size-12 text-muted-foreground/60" strokeWidth={1.5} />
      <span>{message}</span>
    </div>
  );
}
