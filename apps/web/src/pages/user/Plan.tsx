import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Col, Row, Skeleton, Tag, Typography } from "antd";
import { apiGet } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { formatCents, bytesToGB } from "@/lib/format";
import type { Plan } from "@/lib/types";

const PERIODS: Array<{ key: keyof Plan; label: string }> = [
  { key: "month_price", label: "月付" },
  { key: "quarter_price", label: "季付" },
  { key: "half_year_price", label: "半年付" },
  { key: "year_price", label: "年付" },
  { key: "two_year_price", label: "两年付" },
  { key: "three_year_price", label: "三年付" },
  { key: "onetime_price", label: "一次性" }
];

export function PlanPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["user", "plan", "fetch"],
    queryFn: () => apiGet<Plan[]>("/user/plan/fetch")
  });

  if (isLoading) return <Skeleton active />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="暂时没有任何可购的计划"
        description="管理员尚未上架订阅，请稍后再试或联系客服。"
      />
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {data.map((plan) => {
        const soldOut = plan.capacity_limit !== null && plan.capacity_limit <= 0;
        const available = PERIODS.filter((p) => plan[p.key] != null);
        return (
          <Col key={plan.id} xs={24} md={12} lg={8}>
            <Card
              title={plan.name}
              extra={soldOut ? <Tag>已售罄</Tag> : null}
              size="small"
              styles={{ body: { display: "flex", flexDirection: "column", gap: 12 } }}
            >
              {plan.content ? (
                <div
                  style={{ color: "rgba(0,0,0,0.55)", fontSize: 13 }}
                  dangerouslySetInnerHTML={{ __html: plan.content }}
                />
              ) : null}
              <Typography.Text type="secondary">
                {bytesToGB(plan.transfer_enable * 1024 ** 3).toFixed(0)} GB 流量
                {plan.device_limit ? ` · ${plan.device_limit} 台设备` : ""}
                {plan.speed_limit ? ` · ${plan.speed_limit} Mbps` : ""}
              </Typography.Text>
              {available.slice(0, 4).map((p) => (
                <div
                  key={p.key}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "rgba(0,0,0,0.55)" }}>{p.label}</span>
                  <span style={{ fontWeight: 500 }}>
                    {formatCents(plan[p.key] as number)}
                  </span>
                </div>
              ))}
              <Button
                type="primary"
                block
                disabled={soldOut}
                onClick={() => navigate(`/plan/${plan.id}`)}
              >
                {soldOut ? "已售罄" : "查看详情"}
              </Button>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
