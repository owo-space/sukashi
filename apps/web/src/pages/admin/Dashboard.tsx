import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Empty, Row, Skeleton } from "antd";
import {
  ContainerOutlined,
  ControlOutlined,
  LineChartOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined
} from "@ant-design/icons";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { apiGet } from "@/lib/api";
import { formatCents } from "@/lib/format";
import type { RankRow, StatOverview } from "@/lib/types";

const SHORTCUTS = [
  { to: "/admin/setting", icon: <ControlOutlined />, label: "系统设置" },
  { to: "/admin/order", icon: <ContainerOutlined />, label: "订单管理" },
  { to: "/admin/plan", icon: <ShoppingOutlined />, label: "订阅管理" },
  { to: "/admin/user", icon: <UserOutlined />, label: "用户管理" }
];

export function AdminDashboardPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ["admin", "stat", "getOverride"],
    queryFn: () => apiGet<StatOverview>("/admin/stat/getOverride")
  });
  const { data: nodeToday } = useQuery({
    queryKey: ["admin", "stat", "getServerTodayRank"],
    queryFn: () => apiGet<RankRow[]>("/admin/stat/getServerTodayRank")
  });
  const { data: nodeLast } = useQuery({
    queryKey: ["admin", "stat", "getServerLastRank"],
    queryFn: () => apiGet<RankRow[]>("/admin/stat/getServerLastRank")
  });
  const { data: userToday } = useQuery({
    queryKey: ["admin", "stat", "getUserTodayRank"],
    queryFn: () => apiGet<RankRow[]>("/admin/stat/getUserTodayRank")
  });
  const { data: userLast } = useQuery({
    queryKey: ["admin", "stat", "getUserLastRank"],
    queryFn: () => apiGet<RankRow[]>("/admin/stat/getUserLastRank")
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Row>
          {SHORTCUTS.map((s, i) => (
            <Col
              key={s.to}
              flex={1}
              style={{
                borderRight:
                  i < SHORTCUTS.length - 1 ? "1px solid #f0f0f0" : undefined
              }}
            >
              <Link
                to={s.to}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  padding: "28px 0",
                  color: "rgba(0,0,0,0.65)"
                }}
              >
                <span style={{ fontSize: 36, color: "rgba(0,0,0,0.45)" }}>
                  {s.icon}
                </span>
                <span style={{ fontSize: 15 }}>{s.label}</span>
              </Link>
            </Col>
          ))}
        </Row>
        <div style={{ borderTop: "1px solid #f0f0f0", padding: "24px 32px" }}>
          {isLoading || !overview ? (
            <Skeleton active paragraph={{ rows: 2 }} />
          ) : (
            <>
              <Row gutter={32} align="middle">
                <BigStat
                  icon={<TeamOutlined />}
                  label="在线人数"
                  value={String(overview.online_user)}
                />
                <BigStat
                  icon={<LineChartOutlined />}
                  label="今日收入"
                  value={formatCents(overview.day_income)}
                  unit="CNY"
                />
                <BigStat
                  icon={<UserAddOutlined />}
                  label="实时注册"
                  value={String(overview.day_register_total)}
                />
              </Row>
              <Row gutter={32} style={{ marginTop: 24, color: "rgba(0,0,0,0.55)" }}>
                <SmallStat label="本月收入" value={`${formatCents(overview.month_income)} CNY`} />
                <SmallStat label="上月收入" value={`${formatCents(overview.last_month_income)} CNY`} />
                <SmallStat label="上月佣金支出" value={`${formatCents(overview.commission_last_month_payout)} CNY`} />
                <SmallStat label="本月新增用户" value={String(overview.month_register_total)} />
              </Row>
            </>
          )}
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col span={12}>
          <RankCard title="今日节点流量排行" rows={nodeToday ?? []} nameKey="server_name" />
        </Col>
        <Col span={12}>
          <RankCard title="昨日节点流量排行" rows={nodeLast ?? []} nameKey="server_name" />
        </Col>
        <Col span={12}>
          <RankCard title="今日用户流量排行" rows={userToday ?? []} nameKey="email" />
        </Col>
        <Col span={12}>
          <RankCard title="昨日用户流量排行" rows={userLast ?? []} nameKey="email" />
        </Col>
      </Row>
    </div>
  );
}

function BigStat({
  icon,
  label,
  value,
  unit
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <Col flex={1}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "rgba(0,0,0,0.55)", fontSize: 14 }}>{label}</div>
        <span style={{ fontSize: 18, color: "rgba(0,0,0,0.25)" }}>{icon}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 32, color: "rgba(0,0,0,0.85)" }}>{value}</span>
        {unit ? (
          <span style={{ fontSize: 14, color: "rgba(0,0,0,0.45)" }}>{unit}</span>
        ) : null}
      </div>
    </Col>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <Col flex={1}>
      <div style={{ fontSize: 18, color: "rgba(0,0,0,0.85)" }}>{value}</div>
      <div style={{ fontSize: 13, color: "rgba(0,0,0,0.55)" }}>{label}</div>
    </Col>
  );
}

function RankCard({
  title,
  rows,
  nameKey
}: {
  title: string;
  rows: RankRow[];
  nameKey: "server_name" | "email";
}) {
  const data = rows
    .map((r) => ({
      name: (r as unknown as Record<string, unknown>)[nameKey] as string | undefined,
      value: Number(r.total) / 1024 ** 3
    }))
    .filter((d): d is { name: string; value: number } => Boolean(d.name));
  return (
    <Card title={title} size="small" styles={{ body: { height: 320 } }}>
      {data.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无数据"
          style={{ marginTop: 80 }}
        />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis type="number" tick={{ fontSize: 11 }} unit=" GB" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
            <Tooltip
              formatter={(v) => [`${Number(v).toFixed(2)} GB`, "流量"]}
              labelStyle={{ color: "rgba(0,0,0,0.65)" }}
            />
            <Bar dataKey="value" fill="#3b5998" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
