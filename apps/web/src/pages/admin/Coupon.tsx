import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Table, Tag } from "antd";
import dayjs from "dayjs";
import { apiGetEnvelope } from "@/lib/api";
import { formatCents } from "@/lib/format";
import type { Coupon } from "@/lib/types";

export function AdminCouponPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "coupon", "fetch", page, pageSize],
    queryFn: () =>
      apiGetEnvelope<Coupon[]>(`/admin/coupon/fetch?pageSize=${pageSize}&current=${page}`)
  });

  return (
    <Card title="优惠券管理" size="small">
      <Table<Coupon>
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
          { title: "ID", dataIndex: "id", width: 70 },
          { title: "代码", dataIndex: "code" },
          { title: "名称", dataIndex: "name" },
          {
            title: "类型",
            dataIndex: "type",
            width: 100,
            render: (t: number) => (t === 1 ? "金额折扣" : "百分比")
          },
          {
            title: "数值",
            dataIndex: "value",
            render: (v: number, r) => (r.type === 1 ? formatCents(v) : `${v}%`)
          },
          {
            title: "状态",
            dataIndex: "show",
            width: 80,
            render: (s) => <Tag color={s ? "green" : "default"}>{s ? "启用" : "停用"}</Tag>
          },
          {
            title: "有效期",
            dataIndex: "ended_at",
            render: (t: number) => dayjs.unix(t).format("YYYY-MM-DD")
          }
        ]}
      />
    </Card>
  );
}
