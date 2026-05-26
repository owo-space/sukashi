import { useQuery } from "@tanstack/react-query";
import { Card, Table, Tag } from "antd";
import dayjs from "dayjs";
import { apiGet } from "@/lib/api";
import type { Notice } from "@/lib/types";

export function AdminNoticePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "notice", "fetch"],
    queryFn: () => apiGet<Notice[]>("/admin/notice/fetch")
  });

  return (
    <Card title="公告管理" size="small">
      <Table<Notice>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: "ID", dataIndex: "id", width: 70 },
          { title: "标题", dataIndex: "title" },
          {
            title: "状态",
            dataIndex: "show",
            width: 80,
            render: (s) => <Tag color={s ? "green" : "default"}>{s ? "显示" : "隐藏"}</Tag>
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
