import { Typography } from "antd";

export function Snippet({
  value,
  children
}: {
  value?: string;
  children?: React.ReactNode;
}) {
  const text = value ?? (typeof children === "string" ? children : "");
  return (
    <Typography.Paragraph
      code
      copyable={{ text }}
      style={{ margin: 0, padding: "4px 8px" }}
    >
      {children ?? value}
    </Typography.Paragraph>
  );
}
