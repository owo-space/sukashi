import { useQuery } from "@tanstack/react-query";
import { Card, Table, Tag } from "antd";
import dayjs from "dayjs";
import { apiGet } from "@/lib/api";
import type { KnowledgeItem } from "@/lib/types";

export function AdminKnowledgePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "knowledge", "fetch"],
    queryFn: () => apiGet<KnowledgeItem[]>("/admin/knowledge/fetch")
  });

  return (
    <Card title="知识库管理" size="small">
      <Table<KnowledgeItem>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: "ID", dataIndex: "id", width: 70 },
          { title: "分类", dataIndex: "category", width: 140 },
          { title: "标题", dataIndex: "title" },
          { title: "语言", dataIndex: "language", width: 100 },
          {
            title: "状态",
            dataIndex: "show",
            width: 80,
            render: (s) => <Tag color={s ? "green" : "default"}>{s ? "上架" : "下架"}</Tag>
          },
          {
            title: "更新时间",
            dataIndex: "updated_at",
            render: (t: number) => dayjs.unix(t).format("YYYY-MM-DD")
          }
        ]}
      />
    </Card>
  );
}
