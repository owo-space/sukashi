import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Chip, Skeleton } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { formatCents, formatUnix } from "@/lib/format";
import type { Order, PaymentMethod } from "@/lib/types";

const STATUS: Record<number, { label: string; color: "default" | "success" | "warning" | "danger" }> = {
  0: { label: "待支付", color: "warning" },
  1: { label: "处理中", color: "default" },
  2: { label: "已取消", color: "danger" },
  3: { label: "已支付", color: "success" },
  4: { label: "已退款", color: "default" }
};

export function OrderDetailPage() {
  const { tradeNo } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["user", "order", "detail", tradeNo],
    queryFn: () => apiGet<Order & { plan?: { name?: string } }>(`/user/order/detail?trade_no=${tradeNo}`)
  });
  const { data: methods } = useQuery({
    queryKey: ["user", "order", "getPaymentMethod"],
    queryFn: () => apiGet<PaymentMethod[]>("/user/order/getPaymentMethod")
  });

  const cancel = useMutation({
    mutationFn: () => apiPost("/user/order/cancel", { trade_no: tradeNo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user", "order", "detail", tradeNo] });
    }
  });

  async function pay(methodId: number) {
    setError(null);
    setPaying(methodId);
    try {
      const result = await apiPost<{ type: string; data: string } | true>(
        "/user/order/checkout",
        { trade_no: tradeNo, method: methodId }
      );
      if (result === true) {
        void queryClient.invalidateQueries({ queryKey: ["user", "order", "detail", tradeNo] });
      } else if (result && typeof result === "object" && result.type === "url" && typeof result.data === "string") {
        window.location.href = result.data;
      } else {
        setError("支付通道返回异常");
      }
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "支付失败"
      );
    } finally {
      setPaying(null);
    }
  }

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;
  if (!order) {
    return (
      <>
        <PageHeader title="订单详情" />
        <Alert variant="danger">订单不存在</Alert>
      </>
    );
  }

  const status = STATUS[order.status] ?? STATUS[0]!;
  return (
    <>
      <PageHeader
        title="订单详情"
        actions={
          <Button variant="tertiary" onPress={() => navigate("/order")}>
            返回订单列表
          </Button>
        }
      />
      <Card>
        <Card.Content className="space-y-3">
          <Row label="订单号" value={<span className="font-mono">{order.trade_no}</span>} />
          <Row label="订阅" value={order.plan?.name ?? "-"} />
          <Row label="周期" value={order.period} />
          <Row label="金额" value={formatCents(order.total_amount)} />
          <Row
            label="状态"
            value={<Chip variant="default" color={status.color}>{status.label}</Chip>}
          />
          <Row label="创建时间" value={formatUnix(order.created_at)} />
          {order.paid_at ? <Row label="支付时间" value={formatUnix(order.paid_at)} /> : null}
        </Card.Content>
      </Card>

      {order.status === 0 ? (
        <Card className="mt-4">
          <Card.Header>
            <Card.Title>支付订单</Card.Title>
            <Card.Description>选择支付方式继续付款。</Card.Description>
          </Card.Header>
          <Card.Content>
            {error ? (
              <Alert variant="danger" className="mb-3" title="错误">
                {error}
              </Alert>
            ) : null}
            {!methods || methods.length === 0 ? (
              <Alert variant="warning">管理员尚未配置任何支付方式。</Alert>
            ) : (
              <div className="flex flex-wrap gap-3">
                {methods.map((m) => (
                  <Button
                    key={m.id}
                    variant="secondary"
                    isPending={paying === m.id}
                    onPress={() => pay(m.id)}
                  >
                    {m.name}
                  </Button>
                ))}
                <Button variant="tertiary" onPress={() => cancel.mutate()}>
                  取消订单
                </Button>
              </div>
            )}
          </Card.Content>
        </Card>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-default-100 pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
