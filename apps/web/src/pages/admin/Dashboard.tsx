import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  SlidersHorizontal,
  ListOrdered,
  ClipboardList,
  Users,
  TrendingUp,
  UserPlus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { formatBytes, formatCny } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

interface AdminOverview {
  online_user: number;
  month_income: number;
  month_register_total: number;
  day_register_total: number;
  ticket_pending_total: number;
  commission_pending_total: number;
  day_income: number;
  last_month_income: number;
  commission_month_payout: number;
  commission_last_month_payout: number;
}

interface RankRow {
  email?: string;
  server_name?: string;
  total?: number;
  u?: number;
  d?: number;
}

const QUICK_LINKS = [
  { to: "/admin/setting", icon: SlidersHorizontal, label: "系统设置" },
  { to: "/admin/order", icon: ListOrdered, label: "订单管理" },
  { to: "/admin/plan", icon: ClipboardList, label: "订阅管理" },
  { to: "/admin/user", icon: Users, label: "用户管理" }
];

export function AdminDashboardPage() {
  const stat = useQuery({
    queryKey: ["admin.stat.getOverride"],
    queryFn: () => apiGet<AdminOverview>("/admin/stat/getOverride")
  });
  const serverToday = useQuery({
    queryKey: ["admin.getServerTodayRank"],
    queryFn: () =>
      apiGet<RankRow[]>("/admin/stat/getServerTodayRank").catch(() => [] as RankRow[])
  });
  const serverYesterday = useQuery({
    queryKey: ["admin.getServerLastRank"],
    queryFn: () =>
      apiGet<RankRow[]>("/admin/stat/getServerLastRank").catch(() => [] as RankRow[])
  });
  const userToday = useQuery({
    queryKey: ["admin.getUserTodayRank"],
    queryFn: () =>
      apiGet<RankRow[]>("/admin/stat/getUserTodayRank").catch(() => [] as RankRow[])
  });
  const userYesterday = useQuery({
    queryKey: ["admin.getUserLastRank"],
    queryFn: () =>
      apiGet<RankRow[]>("/admin/stat/getUserLastRank").catch(() => [] as RankRow[])
  });

  const s = stat.data;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="grid grid-cols-2 gap-px overflow-hidden bg-border md:grid-cols-4">
          {QUICK_LINKS.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.to}
                to={q.to}
                className="flex flex-col items-center gap-2 bg-card py-6 hover:bg-accent/40"
              >
                <Icon className="size-8 text-foreground" strokeWidth={1.5} />
                <div className="text-sm">{q.label}</div>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 py-4 md:grid-cols-3">
          <StatItem
            label="在线人数"
            value={String(s?.online_user ?? 0)}
            icon={<Users className="size-6 text-muted-foreground" />}
          />
          <StatItem
            label="今日收入"
            value={
              <>
                {formatCny(s?.day_income ?? 0)}
                <span className="ml-2 text-base text-muted-foreground">CNY</span>
              </>
            }
            icon={<TrendingUp className="size-6 text-muted-foreground" />}
          />
          <StatItem
            label="实时注册"
            value={String(s?.day_register_total ?? 0)}
            icon={<UserPlus className="size-6 text-muted-foreground" />}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 py-4 md:grid-cols-4 text-sm">
          <SubStat label="本月收入" value={`${formatCny(s?.month_income ?? 0)} CNY`} />
          <SubStat label="上月收入" value={`${formatCny(s?.last_month_income ?? 0)} CNY`} />
          <SubStat
            label="上月佣金支出"
            value={`${formatCny(s?.commission_last_month_payout ?? 0)} CNY`}
          />
          <SubStat label="本月新增用户" value={String(s?.month_register_total ?? 0)} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RankCard
          title="今日节点流量排行"
          rows={serverToday.data}
          loading={serverToday.isLoading}
          keyField="server_name"
        />
        <RankCard
          title="昨日节点流量排行"
          rows={serverYesterday.data}
          loading={serverYesterday.isLoading}
          keyField="server_name"
        />
        <RankCard
          title="今日用户流量排行"
          rows={userToday.data}
          loading={userToday.isLoading}
          keyField="email"
        />
        <RankCard
          title="昨日用户流量排行"
          rows={userYesterday.data}
          loading={userYesterday.isLoading}
          keyField="email"
        />
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  icon
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {label}
        {icon}
      </div>
      <div className="text-3xl font-medium">{value}</div>
    </div>
  );
}

function SubStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <div className="text-lg font-medium">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function RankCard({
  title,
  rows,
  loading,
  keyField
}: {
  title: string;
  rows: RankRow[] | undefined;
  loading: boolean;
  keyField: "email" | "server_name";
}) {
  const data = (rows ?? []).map((r) => ({
    name: (r[keyField] ?? "—") as string,
    total: Number(r.total ?? (r.u ?? 0) + (r.d ?? 0))
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 16, bottom: 10, left: 4 }}
            >
              <CartesianGrid stroke="hsl(var(--border) / 0.5)" />
              <XAxis type="number" tickFormatter={(v: number) => formatBytes(v)} fontSize={10} />
              <YAxis type="category" dataKey="name" fontSize={10} width={120} />
              <Tooltip formatter={(v) => formatBytes(Number(v))} />
              <Bar dataKey="total" fill="var(--color-chart-1)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
