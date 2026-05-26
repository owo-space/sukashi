import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Form, Input, Select, Skeleton, Typography } from "antd";
import { apiGet, apiPost } from "@/lib/api";
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

export function PlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<string>("month_price");
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: plan, isLoading } = useQuery({
    queryKey: ["user", "plan", "detail", id],
    queryFn: () => apiGet<Plan | null>(`/user/plan/fetch?id=${id}`)
  });

  const buy = useMutation({
    mutationFn: () =>
      apiPost<string>("/user/order/save", {
        plan_id: Number(id),
        period,
        coupon_code: couponCode || undefined
      }),
    onSuccess: (tradeNo) => navigate(`/order/${tradeNo}`),
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "下单失败"
      );
    }
  });

  if (isLoading) return <Skeleton active />;
  if (!plan) return <Alert type="error" message="订阅不存在或已下架" showIcon />;

  const available = PERIODS.filter((p) => plan[p.key] != null);
  const currentPrice = (plan[period as keyof Plan] as number | null) ?? 0;

  return (
    <Card title={plan.name} size="small">
      {plan.content ? (
        <div
          style={{ marginBottom: 16 }}
          dangerouslySetInnerHTML={{ __html: plan.content }}
        />
      ) : null}
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        {bytesToGB(plan.transfer_enable * 1024 ** 3).toFixed(0)} GB 流量
        {plan.device_limit ? ` · ${plan.device_limit} 台设备` : ""}
        {plan.speed_limit ? ` · ${plan.speed_limit} Mbps` : ""}
      </Typography.Text>
      {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}
      <Form
        layout="vertical"
        style={{ maxWidth: 480 }}
        onFinish={() => {
          setError(null);
          buy.mutate();
        }}
      >
        <Form.Item label="购买周期">
          <Select
            value={period}
            onChange={setPeriod}
            options={available.map((p) => ({
              value: String(p.key),
              label: `${p.label} · ${formatCents(plan[p.key] as number)}`
            }))}
          />
        </Form.Item>
        <Form.Item label="优惠券码（可选）">
          <Input
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            placeholder="如有优惠券请填写"
          />
        </Form.Item>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 12px",
            background: "#f5f5f5",
            borderRadius: 4,
            marginBottom: 16
          }}
        >
          <span style={{ color: "rgba(0,0,0,0.55)" }}>应付</span>
          <span style={{ fontSize: 20, fontWeight: 600 }}>{formatCents(currentPrice)}</span>
        </div>
        <Button type="primary" htmlType="submit" block loading={buy.isPending}>
          立即下单
        </Button>
      </Form>
    </Card>
  );
}
