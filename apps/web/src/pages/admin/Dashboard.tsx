import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import { formatBytes, formatCny } from "@/lib/format";
import {
  Bar,
  BarChart,
  LabelList,
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <StatItem label="在线人数" value={String(s?.online_user ?? 0)} />
        <StatItem
          label="今日收入"
          value={
            <>
              {formatCny(s?.day_income ?? 0)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">CNY</span>
            </>
          }
        />
        <StatItem label="实时注册" value={String(s?.day_register_total ?? 0)} />
        <StatItem
          label="本月收入"
          value={
            <>
              {formatCny(s?.month_income ?? 0)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">CNY</span>
            </>
          }
        />
        <StatItem
          label="上月收入"
          value={
            <>
              {formatCny(s?.last_month_income ?? 0)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">CNY</span>
            </>
          }
        />
        <StatItem
          label="上月佣金支出"
          value={
            <>
              {formatCny(s?.commission_last_month_payout ?? 0)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">CNY</span>
            </>
          }
        />
        <StatItem label="本月新增用户" value={String(s?.month_register_total ?? 0)} />
      </div>

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

function StatItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-0.5 px-4 py-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate text-lg font-semibold leading-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function truncateLabel(name: string): string {
  if (!name) return "—";
  if (name.includes("@")) {
    const [user, domain] = name.split("@");
    const head = user.length > 10 ? `${user.slice(0, 10)}…` : user;
    return `${head}@${domain.split(".")[0]}`;
  }
  return name.length > 16 ? `${name.slice(0, 16)}…` : name;
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
  // API returns total in GiB units (V2Board convention: row.u+row.d divided
  // by 1024^3 server-side). Convert back to bytes so formatBytes works.
  const GIB = 1024 ** 3;
  const data = (rows ?? []).map((r) => {
    const gib = r.total != null ? Number(r.total) : (Number(r.u ?? 0) + Number(r.d ?? 0)) / GIB;
    return {
      name: (r[keyField] ?? "—") as string,
      bytes: gib * GIB
    };
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-56">
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
              margin={{ top: 4, right: 64, bottom: 4, left: 0 }}
              barCategoryGap="20%"
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={truncateLabel}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                formatter={(v) => [formatBytes(Number(v)), "流量"] as [string, string]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--popover)"
                }}
                labelStyle={{ fontSize: 12, fontWeight: 500 }}
              />
              <Bar dataKey="bytes" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20}>
                <LabelList
                  dataKey="bytes"
                  position="right"
                  formatter={(v) => formatBytes(Number(v))}
                  style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
