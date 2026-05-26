import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Skeleton, Statistic } from "antd";
import { apiGet } from "@/lib/api";
import { formatCents } from "@/lib/format";
import type { StatOverview } from "@/lib/types";

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stat", "getOverride"],
    queryFn: () => apiGet<StatOverview>("/admin/stat/getOverride")
  });

  if (isLoading || !data) return <Skeleton active />;

  return (
    <Row gutter={[16, 16]}>
      <Col span={6}><Card size="small"><Statistic title="在线用户" value={data.online_user} /></Card></Col>
      <Col span={6}><Card size="small"><Statistic title="今日收入" value={formatCents(data.day_income)} /></Card></Col>
      <Col span={6}><Card size="small"><Statistic title="本月收入" value={formatCents(data.month_income)} /></Card></Col>
      <Col span={6}><Card size="small"><Statistic title="上月收入" value={formatCents(data.last_month_income)} /></Card></Col>
      <Col span={6}><Card size="small"><Statistic title="今日注册" value={data.day_register_total} /></Card></Col>
      <Col span={6}><Card size="small"><Statistic title="本月注册" value={data.month_register_total} /></Card></Col>
      <Col span={6}><Card size="small"><Statistic title="待回复工单" value={data.ticket_pending_total} /></Card></Col>
      <Col span={6}><Card size="small"><Statistic title="待结算佣金" value={formatCents(data.commission_pending_total)} /></Card></Col>
    </Row>
  );
}
