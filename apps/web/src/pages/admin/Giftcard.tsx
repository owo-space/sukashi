import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Table, Tag } from "antd";
import dayjs from "dayjs";
import { apiGetEnvelope } from "@/lib/api";
import { formatCents } from "@/lib/format";
import type { Giftcard } from "@/lib/types";

export function AdminGiftcardPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "giftcard", "fetch", page, pageSize],
    queryFn: () =>
      apiGetEnvelope<Giftcard[]>(`/admin/giftcard/fetch?pageSize=${pageSize}&current=${page}`)
  });

  return (
    <Card title="礼品卡管理" size="small">
      <Table<Giftcard>
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
            render: (t: number) => ["余额", "订阅", "流量"][t] ?? t
          },
          {
            title: "面值",
            dataIndex: "value",
            render: (v: number | null) => (v == null ? "-" : formatCents(v))
          },
          {
            title: "可用次数",
            dataIndex: "limit_use",
            render: (v) => v ?? "不限"
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
