import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Table, Tag } from "antd";
import dayjs from "dayjs";
import { apiGetEnvelope } from "@/lib/api";
import { formatCents } from "@/lib/format";
import type { Order } from "@/lib/types";

const STATUS = ["待支付", "开通中", "已取消", "已完成", "已折抵"];
const COLOR = ["orange", "blue", "default", "green", "purple"];

export function AdminOrderPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order", "fetch", page, pageSize],
    queryFn: () =>
      apiGetEnvelope<Order[]>(`/admin/order/fetch?pageSize=${pageSize}&current=${page}`)
  });

  return (
    <Card title="订单管理" size="small">
      <Table<Order>
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data ?? []}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          }
        }}
        columns={[
          { title: "订单号", dataIndex: "trade_no" },
          { title: "用户", dataIndex: "user_id", width: 80 },
          { title: "订阅", dataIndex: ["plan", "name"], render: (v) => v ?? "-" },
          { title: "周期", dataIndex: "period", width: 100 },
          {
            title: "金额",
            dataIndex: "total_amount",
            width: 110,
            render: (v: number) => formatCents(v)
          },
          {
            title: "状态",
            dataIndex: "status",
            width: 100,
            render: (s: number) => (
              <Tag color={COLOR[s] ?? "default"}>{STATUS[s] ?? s}</Tag>
            )
          },
          {
            title: "创建时间",
            dataIndex: "created_at",
            render: (t: number) => dayjs.unix(t).format("YYYY-MM-DD HH:mm")
          }
        ]}
      />
    </Card>
  );
}
