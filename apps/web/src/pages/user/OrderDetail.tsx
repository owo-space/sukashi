import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { Order, Plan } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCny, formatUnixDate } from "@/lib/format";

interface PaymentMethod {
  id: number;
  name: string;
  payment: string;
  icon?: string | null;
}

export function UserOrderDetailPage() {
  const { tradeNo } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["user.order.detail", tradeNo],
    queryFn: () =>
      apiGet<Order & { plan?: Plan }>("/user/order/detail", { params: { trade_no: tradeNo } }),
    enabled: Boolean(tradeNo),
    refetchInterval: (q) => {
      const d = q.state.data as Order | undefined;
      return d && d.status === 0 ? 5_000 : false;
    }
  });

  const { data: methods } = useQuery({
    queryKey: ["user.order.getPaymentMethod"],
    queryFn: () => apiGet<PaymentMethod[]>("/user/order/getPaymentMethod")
  });

  const checkout = useMutation({
    mutationFn: async (paymentId: number) => {
      return apiPost<{ type: string; data: string } | boolean>("/user/order/checkout", {
        trade_no: tradeNo,
        method: paymentId
      });
    },
    onSuccess: (res) => {
      if (typeof res === "object" && res && "type" in res && res.type === "url") {
        window.location.href = res.data;
      } else if (res === true) {
        toast.success("订单已完成");
        qc.invalidateQueries({ queryKey: ["user.order.detail", tradeNo] });
      } else {
        toast.error("结算失败");
      }
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : (err as Error).message);
    }
  });

  const cancel = useMutation({
    mutationFn: () => apiPost<boolean>("/user/order/cancel", { trade_no: tradeNo }),
    onSuccess: () => {
      toast.success("订单已取消");
      navigate("/order");
    }
  });

  useEffect(() => {
    if (order && order.status === 3) {
      toast.success("订单已支付");
    }
  }, [order?.status]);

  if (isLoading || !order) return <Skeleton className="h-64 w-full" />;

  const statusLabel: Record<number, string> = {
    0: "待支付",
    1: "处理中",
    2: "已取消",
    3: "已完成",
    4: "已折扣"
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-medium">订单详情</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <Row label="订单号" value={<span className="font-mono text-xs">{order.trade_no}</span>} />
          <Row label="订阅" value={order.plan?.name ?? "—"} />
          <Row label="状态" value={<Badge>{statusLabel[order.status] ?? order.status}</Badge>} />
          <Row label="金额" value={<>¥ {formatCny(order.total_amount)}</>} />
          <Row label="创建时间" value={formatUnixDate(order.created_at)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">支付</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {order.status === 0 ? (
            <>
              {(methods ?? []).map((m) => (
                <Button
                  key={m.id}
                  variant="outline"
                  onClick={() => checkout.mutate(m.id)}
                  disabled={checkout.isPending}
                  className="justify-between"
                >
                  <span>{m.name}</span>
                  <span className="text-xs text-muted-foreground">{m.payment}</span>
                </Button>
              ))}
              {(methods ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无可用支付方式</div>
              ) : null}
              <Button
                variant="ghost"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
                className="text-destructive"
              >
                取消订单
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">此订单无需再支付。</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b last:border-0 pb-2 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
