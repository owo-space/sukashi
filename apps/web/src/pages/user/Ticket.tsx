import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Table, Tag } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { apiGet } from "@/lib/api";
import type { Ticket } from "@/lib/types";

const LEVEL = ["低", "中", "高"];
const STATUS = ["待回复", "已回复", "已关闭"];

export function TicketPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user", "ticket", "fetch"],
    queryFn: () => apiGet<Ticket[]>("/user/ticket/fetch")
  });

  return (
    <Card
      title="我的工单"
      size="small"
      extra={
        <Link to="/ticket/new">
          <Button type="primary" icon={<PlusOutlined />}>
            新建工单
          </Button>
        </Link>
      }
    >
      <Table<Ticket>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        pagination={{ pageSize: 10 }}
        columns={[
          {
            title: "主题",
            dataIndex: "subject",
            render: (s: string, row) => <Link to={`/ticket/${row.id}`}>{s}</Link>
          },
          { title: "级别", dataIndex: "level", render: (l: number) => LEVEL[l] ?? l },
          {
            title: "状态",
            dataIndex: "status",
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
