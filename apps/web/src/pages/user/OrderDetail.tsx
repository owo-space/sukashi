import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { Order, Plan } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCny, formatUnixDate } from "@/lib/format";

interface PaymentMethod {
  id: number;
  name: string;
  payment: string;
  icon?: string | null;
}

const STATUS_LABEL: Record<number, { label: string; cls: string }> = {
  0: { label: "待支付", cls: "bg-primary text-primary-foreground" },
  1: { label: "已支付", cls: "bg-emerald-500 text-white" },
  2: { label: "已取消", cls: "bg-slate-300 text-slate-700" },
  3: { label: "已完成", cls: "bg-emerald-500 text-white" },
  4: { label: "已折扣", cls: "bg-indigo-500 text-white" }
};

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
        // hosted Stripe Checkout — redirect immediately so the user lands
        // on the payment page automatically after creating the order.
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
  const status = STATUS_LABEL[order.status] ?? { label: String(order.status), cls: "bg-slate-300" };
  const list = methods ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="rounded border-slate-200 lg:col-span-2">
        <CardHeader className="border-b border-slate-100 py-3">
          <CardTitle className="text-sm font-medium text-slate-700">订单详情</CardTitle>
        </CardHeader>
        <CardContent className="py-4 text-sm">
          <Row label="订单号" value={<span className="font-mono text-xs">{order.trade_no ?? "—"}</span>} />
          <Row label="订阅" value={order.plan?.name ?? "—"} />
          <Row
            label="状态"
            value={
              <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs ${status.cls}`}>
                {status.label}
              </span>
            }
          />
          <Row label="金额" value={<>¥ {formatCny(order.total_amount)}</>} />
          <Row label="创建时间" value={formatUnixDate(order.created_at)} last />
        </CardContent>
      </Card>

      <Card className="rounded border-slate-200">
        <CardHeader className="border-b border-slate-100 py-3">
          <CardTitle className="text-sm font-medium text-slate-700">支付</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 py-4">
          {order.status === 0 ? (
            <>
              {list.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无可用支付方式</div>
              ) : list.length === 1 ? (
                <Button
                  onClick={() => checkout.mutate(list[0]!.id)}
                  disabled={checkout.isPending}
                  className="w-full"
                >
                  <CreditCard className="size-4" />
                  {checkout.isPending ? "跳转中…" : `立即支付 (${list[0]!.name})`}
                </Button>
              ) : (
                list.map((m) => (
                  <Button
                    key={m.id}
                    variant="outline"
                    onClick={() => checkout.mutate(m.id)}
                    disabled={checkout.isPending}
                    className="w-full justify-between"
                  >
                    <span>{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.payment}</span>
                  </Button>
                ))
              )}
              <button
                type="button"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
                className="w-full py-2 text-sm text-destructive hover:underline"
              >
                取消订单
              </button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">此订单无需再支付。</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  last
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`flex justify-between ${last ? "" : "border-b border-slate-100 pb-2.5 mb-2.5"}`}>
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
