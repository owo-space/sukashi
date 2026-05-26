import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Descriptions, Select, Skeleton, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { apiGet, apiPost } from "@/lib/api";
import { formatCents } from "@/lib/format";
import type { Order, PaymentMethod } from "@/lib/types";

const STATUS: Record<number, { label: string; color: string }> = {
  0: { label: "待支付", color: "orange" },
  1: { label: "开通中", color: "blue" },
  2: { label: "已取消", color: "default" },
  3: { label: "已完成", color: "green" },
  4: { label: "已折抵", color: "purple" }
};

export function OrderDetailPage() {
  const { tradeNo } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [paymentId, setPaymentId] = useState<number | undefined>();
  const [error, setError] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["user", "order", "detail", tradeNo],
    queryFn: () => apiGet<Order>(`/user/order/detail?trade_no=${tradeNo}`)
  });
  const { data: methods } = useQuery({
    queryKey: ["user", "order", "getPaymentMethod"],
    queryFn: () => apiGet<PaymentMethod[]>("/user/order/getPaymentMethod")
  });

  const checkout = useMutation({
    mutationFn: () =>
      apiPost<{ type: number; data: string }>("/user/order/checkout", {
        trade_no: tradeNo,
        method: paymentId
      }),
    onSuccess: (res) => {
      if (res?.type === 1 && typeof res.data === "string") {
        window.location.href = res.data;
      } else {
        void qc.invalidateQueries({ queryKey: ["user", "order"] });
      }
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "支付失败"
      );
    }
  });

  if (isLoading) return <Skeleton active />;
  if (!order) return <Alert type="error" message="订单不存在" showIcon />;

  const status = STATUS[order.status] ?? { label: String(order.status), color: "default" };

  return (
    <Card title={`订单 ${order.trade_no}`} size="small">
      {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="状态">
          <Tag color={status.color}>{status.label}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="订阅">{order.plan?.name ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="周期">{order.period}</Descriptions.Item>
        <Descriptions.Item label="金额">{formatCents(order.total_amount)}</Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {dayjs.unix(order.created_at).format("YYYY-MM-DD HH:mm")}
        </Descriptions.Item>
      </Descriptions>
      {order.status === 0 ? (
        <Space style={{ marginTop: 16 }}>
          <Select
            placeholder="选择支付方式"
            style={{ width: 200 }}
            value={paymentId}
            onChange={setPaymentId}
            options={(methods ?? []).map((m) => ({ value: m.id, label: m.name }))}
          />
          <Button
            type="primary"
            disabled={!paymentId}
            loading={checkout.isPending}
            onClick={() => {
              setError(null);
              checkout.mutate();
            }}
          >
            立即支付
          </Button>
          <Button onClick={() => navigate("/order")}>返回</Button>
        </Space>
      ) : null}
    </Card>
  );
}
