import { useQuery } from "@tanstack/react-query";
import { Card, Table, Tag } from "antd";
import dayjs from "dayjs";
import { apiGet } from "@/lib/api";
import { formatCents } from "@/lib/format";
import type { Plan } from "@/lib/types";

export function AdminPlanPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "plan", "fetch"],
    queryFn: () => apiGet<Plan[]>("/admin/plan/fetch")
  });

  return (
    <Card title="订阅管理" size="small">
      <Table<Plan>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: "ID", dataIndex: "id", width: 70 },
          { title: "名称", dataIndex: "name" },
          { title: "流量(GB)", dataIndex: "transfer_enable", width: 110 },
          { title: "设备", dataIndex: "device_limit", width: 90 },
          {
            title: "月付",
            dataIndex: "month_price",
            render: (v: number | null) => (v == null ? "-" : formatCents(v))
          },
          {
            title: "年付",
            dataIndex: "year_price",
            render: (v: number | null) => (v == null ? "-" : formatCents(v))
          },
          {
            title: "状态",
            dataIndex: "show",
            width: 80,
            render: (s: number) => (
              <Tag color={s ? "green" : "default"}>{s ? "上架" : "下架"}</Tag>
            )
          },
          {
            title: "用户数",
            dataIndex: "count",
            width: 80,
            render: (v) => v ?? 0
          },
          {
            title: "创建时间",
            dataIndex: "created_at",
            render: (t) => (t ? dayjs.unix(t).format("YYYY-MM-DD") : "-")
          }
        ]}
      />
    </Card>
  );
}
