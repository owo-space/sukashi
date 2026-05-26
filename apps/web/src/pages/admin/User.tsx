import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Input, Table, Tag } from "antd";
import dayjs from "dayjs";
import { apiGetEnvelope } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { UserInfo } from "@/lib/types";

export function AdminUserPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "user", "fetch", page, pageSize, search],
    queryFn: () =>
      apiGetEnvelope<UserInfo[]>(
        `/admin/user/fetch?pageSize=${pageSize}&current=${page}${
          search ? `&filter[0][key]=email&filter[0][condition]=like&filter[0][value]=${encodeURIComponent(search)}` : ""
        }`
      )
  });

  return (
    <Card
      title="用户管理"
      size="small"
      extra={
        <Input.Search
          placeholder="搜索邮箱"
          allowClear
          style={{ width: 240 }}
          onSearch={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
      }
    >
      <Table<UserInfo>
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
          { title: "邮箱", dataIndex: "email" },
          {
            title: "状态",
            dataIndex: "banned",
            width: 80,
            render: (b: number) => (
              <Tag color={b ? "red" : "green"}>{b ? "封禁" : "正常"}</Tag>
            )
          },
          { title: "订阅", dataIndex: "plan_name", render: (v) => v ?? "-" },
          {
            title: "已用",
            render: (_, r) => formatBytes(Number(r.u) + Number(r.d))
          },
          {
            title: "到期时间",
            dataIndex: "expired_at",
            render: (t: number | null) =>
              t ? dayjs.unix(t).format("YYYY-MM-DD") : "长期"
          },
          {
            title: "注册时间",
            dataIndex: "created_at",
            render: (t: number) => dayjs.unix(t).format("YYYY-MM-DD")
          }
        ]}
      />
    </Card>
  );
}
