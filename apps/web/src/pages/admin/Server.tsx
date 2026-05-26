import { useQuery } from "@tanstack/react-query";
import { Card, Table, Tag } from "antd";
import { apiGet } from "@/lib/api";
import type { ServerNode } from "@/lib/types";

export function AdminServerPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "server", "manage", "getNodes"],
    queryFn: () => apiGet<ServerNode[]>("/admin/server/manage/getNodes")
  });

  return (
    <Card title="节点管理" size="small">
      <Table<ServerNode>
        rowKey={(r) => `${r.type}-${r.id}`}
        loading={isLoading}
        dataSource={data ?? []}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: "ID", dataIndex: "id", width: 70 },
          {
            title: "协议",
            dataIndex: "type",
            width: 100,
            render: (t: string) => <Tag>{t}</Tag>
          },
          { title: "名称", dataIndex: "name" },
          { title: "地址", dataIndex: "host" },
          { title: "端口", dataIndex: "port", width: 100 },
          { title: "倍率", dataIndex: "rate", width: 80 },
          {
            title: "在线",
            dataIndex: "online",
            width: 80,
            render: (n) => <Tag color={n ? "green" : "default"}>{n ?? 0}</Tag>
          },
          {
            title: "状态",
            dataIndex: "show",
            width: 80,
            render: (s: number) => (
              <Tag color={s ? "green" : "red"}>{s ? "启用" : "关闭"}</Tag>
            )
          }
        ]}
      />
    </Card>
  );
}
