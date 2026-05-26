import { useQuery } from "@tanstack/react-query";
import { Card, Table, Tag } from "antd";
import { apiGet } from "@/lib/api";
import type { PaymentRow } from "@/lib/types";

export function AdminPaymentPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payment", "fetch"],
    queryFn: () => apiGet<PaymentRow[]>("/admin/payment/fetch")
  });

  return (
    <Card title="支付配置" size="small">
      <Table<PaymentRow>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={false}
        columns={[
          { title: "ID", dataIndex: "id", width: 70 },
          { title: "名称", dataIndex: "name" },
          { title: "驱动", dataIndex: "payment" },
          {
            title: "状态",
            dataIndex: "enable",
            width: 80,
            render: (e: boolean) => (
              <Tag color={e ? "green" : "default"}>{e ? "启用" : "停用"}</Tag>
            )
          }
        ]}
      />
    </Card>
  );
}
