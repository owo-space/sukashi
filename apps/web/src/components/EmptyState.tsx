import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

interface Props {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title = "暂无数据",
  description,
  action
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-default-200 bg-default-50/50 py-12 text-center">
      <Inbox className="mb-3 size-10 text-default-400" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <div className="mt-1 text-xs text-muted">{description}</div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
