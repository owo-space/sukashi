import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, Table } from "@heroui/react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { formatCents } from "@/lib/format";
import type { RankRow, StatOrderPoint, StatOverview } from "@/lib/types";

export function AdminDashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["admin", "stat", "getOverride"],
    queryFn: () => apiGet<StatOverview>("/admin/stat/getOverride")
  });
  const { data: order } = useQuery({
    queryKey: ["admin", "stat", "getOrder"],
    queryFn: () => apiGet<StatOrderPoint[]>("/admin/stat/getOrder")
  });
  const { data: userToday } = useQuery({
    queryKey: ["admin", "stat", "getUserTodayRank"],
    queryFn: () => apiGet<RankRow[]>("/admin/stat/getUserTodayRank")
  });
  const { data: serverToday } = useQuery({
    queryKey: ["admin", "stat", "getServerTodayRank"],
    queryFn: () => apiGet<RankRow[]>("/admin/stat/getServerTodayRank")
  });

  // Pivot getOrder rows (long format) into recharts data
  const chartData = (() => {
    const byDate: Record<string, Record<string, number>> = {};
    for (const p of order ?? []) {
      byDate[p.date] = byDate[p.date] ?? { date: p.date } as Record<string, number>;
      const entry = byDate[p.date]!;
      entry[p.type] = p.value;
    }
    return Object.values(byDate);
  })();

  return (
    <>
      <PageHeader title="概览" description="今日 / 本月数据汇总。" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile label="在线用户" value={overview?.online_user ?? 0} loading={isLoading} />
        <StatTile label="本月营收" value={formatCents(overview?.month_income ?? 0)} loading={isLoading} />
        <StatTile label="今日营收" value={formatCents(overview?.day_income ?? 0)} loading={isLoading} />
        <StatTile label="本月新注册" value={overview?.month_register_total ?? 0} loading={isLoading} />
        <StatTile label="今日新注册" value={overview?.day_register_total ?? 0} loading={isLoading} />
        <StatTile label="待处理工单" value={overview?.ticket_pending_total ?? 0} loading={isLoading} />
        <StatTile label="待结算佣金" value={overview?.commission_pending_total ?? 0} loading={isLoading} />
        <StatTile label="上月营收" value={formatCents(overview?.last_month_income ?? 0)} loading={isLoading} />
      </div>

      <Card className="mt-4">
        <Card.Header>
          <Card.Title>近 31 日订单 / 注册</Card.Title>
        </Card.Header>
        <Card.Content className="h-72">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted">暂无数据</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="注册人数" stroke="#1f3a68" strokeWidth={2} />
                <Line type="monotone" dataKey="收款金额" stroke="#f5a623" strokeWidth={2} />
                <Line type="monotone" dataKey="收款笔数" stroke="#16a34a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card.Content>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <RankCard title="今日用户消耗排行（GB）" rows={userToday ?? []} kind="user" />
        <RankCard title="今日节点流量排行（GB）" rows={serverToday ?? []} kind="server" />
      </div>
    </>
  );
}

function StatTile({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return (
    <Card>
      <Card.Content>
        {loading ? (
          <Skeleton className="h-7 w-20" />
        ) : (
          <div className="text-2xl font-semibold">{value}</div>
        )}
        <div className="text-sm text-muted">{label}</div>
      </Card.Content>
    </Card>
  );
}

function RankCard({
  title,
  rows,
  kind
}: {
  title: string;
  rows: RankRow[];
  kind: "user" | "server";
}) {
  return (
    <Card>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
      </Card.Header>
      <Card.Content className="p-0">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted">暂无数据</div>
        ) : (
          <Table className="dense-table">
            <Table.ScrollContainer>
              <Table.Content aria-label={title}>
                <Table.Header>
                  <Table.Column isRowHeader>{kind === "user" ? "邮箱" : "节点"}</Table.Column>
                  <Table.Column>流量 (GB)</Table.Column>
                </Table.Header>
                <Table.Body>
                  {rows.map((r, i) => (
                    <Table.Row key={i}>
                      <Table.Cell>{kind === "user" ? r.email : r.server_name}</Table.Cell>
                      <Table.Cell>{r.total.toFixed(2)}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card.Content>
    </Card>
  );
}
