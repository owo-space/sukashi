import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Table, Tag } from "antd";
import dayjs from "dayjs";
import { apiGetEnvelope } from "@/lib/api";
import type { Ticket } from "@/lib/types";

const STATUS = ["待回复", "已回复", "已关闭"];

export function AdminTicketPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ticket", "fetch", page, pageSize],
    queryFn: () =>
      apiGetEnvelope<Ticket[]>(`/admin/ticket/fetch?pageSize=${pageSize}&current=${page}`)
  });

  return (
    <Card title="工单管理" size="small">
      <Table<Ticket>
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
          { title: "用户", dataIndex: "user_id", width: 80 },
          { title: "主题", dataIndex: "subject" },
          {
            title: "状态",
            dataIndex: "status",
            width: 100,
            render: (s: number) => (
              <Tag color={s === 0 ? "orange" : s === 1 ? "blue" : "default"}>
                {STATUS[s] ?? s}
              </Tag>
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
