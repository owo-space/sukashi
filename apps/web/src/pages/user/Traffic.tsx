import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, Table } from "antd";
import dayjs from "dayjs";
import { apiGet } from "@/lib/api";
import { formatBytes } from "@/lib/format";
import type { TrafficLogRow } from "@/lib/types";

export function TrafficPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user", "stat", "getTrafficLog"],
    queryFn: () => apiGet<TrafficLogRow[]>("/user/stat/getTrafficLog")
  });

  if (isLoading) return <Skeleton active />;

  return (
    <Card title="流量明细" size="small">
      <Table<TrafficLogRow>
        rowKey={(r) => `${r.record_at}-${r.user_id ?? ""}`}
        dataSource={data ?? []}
        pagination={{ pageSize: 20 }}
        columns={[
          {
            title: "日期",
            dataIndex: "record_at",
            render: (t: number) => dayjs.unix(t).format("YYYY-MM-DD")
          },
          { title: "上传", dataIndex: "u", render: (v: number) => formatBytes(Number(v)) },
          { title: "下载", dataIndex: "d", render: (v: number) => formatBytes(Number(v)) },
          {
            title: "总计",
            render: (_v, r) => formatBytes(Number(r.u) + Number(r.d))
          },
          { title: "倍率", dataIndex: "server_rate" }
        ]}
      />
    </Card>
  );
}
