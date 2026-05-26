import type { ReactNode } from "react";
import { Typography } from "antd";

interface Props {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: Props) {
  return (
    <div
      style={{
        marginBottom: 16,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {description ? (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {description}
          </Typography.Text>
        ) : null}
      </div>
      {actions ? (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}
