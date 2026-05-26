import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Table, Tag } from "antd";
import dayjs from "dayjs";
import { apiGet } from "@/lib/api";
import { formatCents } from "@/lib/format";
import type { Order } from "@/lib/types";

const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: "待支付", color: "orange" },
  1: { label: "开通中", color: "blue" },
  2: { label: "已取消", color: "default" },
  3: { label: "已完成", color: "green" },
  4: { label: "已折抵", color: "purple" }
};

export function OrderPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user", "order", "fetch"],
    queryFn: () => apiGet<Order[]>("/user/order/fetch")
  });

  return (
    <Table<Order>
      rowKey="trade_no"
      loading={isLoading}
      dataSource={data ?? []}
      pagination={{ pageSize: 10 }}
      columns={[
        {
          title: "订单号",
          dataIndex: "trade_no",
          render: (no: string) => <Link to={`/order/${no}`}>{no}</Link>
        },
        { title: "订阅", dataIndex: ["plan", "name"], render: (v) => v ?? "-" },
        { title: "周期", dataIndex: "period" },
        {
          title: "金额",
          dataIndex: "total_amount",
          render: (v: number) => formatCents(v)
        },
        {
          title: "状态",
          dataIndex: "status",
          render: (s: number) => {
            const m = STATUS[s] ?? { label: String(s), color: "default" };
            return <Tag color={m.color}>{m.label}</Tag>;
          }
        },
        {
          title: "创建时间",
          dataIndex: "created_at",
          render: (t: number) => dayjs.unix(t).format("YYYY-MM-DD HH:mm")
        }
      ]}
    />
  );
}
