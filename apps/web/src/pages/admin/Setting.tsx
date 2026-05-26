import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, Tabs } from "antd";
import { apiGet } from "@/lib/api";
import type { ConfigTree } from "@/lib/types";

export function AdminSettingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "config", "fetch"],
    queryFn: () => apiGet<ConfigTree>("/admin/config/fetch")
  });

  if (isLoading || !data) return <Skeleton active />;

  const tabs = Object.entries(data).map(([group, values]) => ({
    key: group,
    label: group,
    children: (
      <pre style={{ background: "#fafafa", padding: 12, borderRadius: 4, overflow: "auto" }}>
        {JSON.stringify(values, null, 2)}
      </pre>
    )
  }));

  return (
    <Card title="系统配置" size="small">
      <Tabs items={tabs} />
    </Card>
  );
}
