import type { ReactNode } from "react";
import { Empty } from "antd";

interface Props {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title = "暂无数据", description, action }: Props) {
  return (
    <Empty
      description={
        <div>
          <div>{title}</div>
          {description ? <div style={{ marginTop: 4 }}>{description}</div> : null}
        </div>
      }
      style={{ padding: "48px 0" }}
    >
      {action}
    </Empty>
  );
}
