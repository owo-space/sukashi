import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ticket, CheckCircle2 } from "lucide-react";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { Plan } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatCny } from "@/lib/format";

const PERIODS: Array<{ key: keyof Plan; label: string }> = [
  { key: "month_price", label: "月付" },
  { key: "quarter_price", label: "季付" },
  { key: "half_year_price", label: "半年付" },
  { key: "year_price", label: "年付" },
  { key: "two_year_price", label: "两年付" },
  { key: "three_year_price", label: "三年付" },
  { key: "onetime_price", label: "一次性" }
];

export function UserPlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const planId = Number(id);
  const [period, setPeriod] = useState<string>("");
  const [coupon, setCoupon] = useState("");
  const [couponOk, setCouponOk] = useState<{ value: number; type: number } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["user.plan.detail", planId],
    queryFn: () => apiGet<Plan>("/user/plan/fetch", { params: { id: planId } })
  });

  const verifyCoupon = useMutation({
    mutationFn: () => {
      if (!period) throw new Error("请先选择购买周期");
      return apiPost<{
        id: number;
        code: string;
        name: string;
        type: number;
        value: number;
        discount_amount?: number;
      }>("/user/coupon/check", {
        code: coupon,
        plan_id: planId,
        period
      });
    },
    onSuccess: (res) => {
      setCouponOk({ type: res.type, value: res.value });
      toast.success("优惠券有效");
    },
    onError: (e) => {
      setCouponOk(null);
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    }
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!period) throw new Error("请选择购买周期");
      const tradeNo = await apiPost<string>("/user/order/save", {
        plan_id: planId,
        period,
        coupon_code: coupon || undefined
      });
      if (!tradeNo) throw new Error("订单创建失败");
      // immediately try checkout — Sukashi is Stripe-only so the user can
      // skip the intermediate order-detail page when there's a single
      // active gateway.
      const methods = await apiGet<Array<{ id: number; name: string }>>("/user/order/getPaymentMethod");
      if (Array.isArray(methods) && methods.length === 1) {
        const res = await apiPost<{ type: string; data: string } | boolean>(
          "/user/order/checkout",
          { trade_no: tradeNo, method: methods[0]!.id }
        );
        if (typeof res === "object" && res && "type" in res && res.type === "url") {
          window.location.href = res.data;
          return tradeNo;
        }
      }
      return tradeNo;
    },
    onSuccess: (tradeNo) => {
      toast.success("订单已创建");
      navigate(`/order/${tradeNo}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : (err as Error).message);
    }
  });

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;

  const offered = PERIODS.filter((p) => {
    const v = data[p.key] as number | null | undefined;
    return v != null && v > 0;
  });
  const currentPrice =
    period && (data[period as keyof Plan] as number | null | undefined)
      ? (data[period as keyof Plan] as number)
      : null;
  let discounted = currentPrice ?? 0;
  if (currentPrice && couponOk) {
    discounted =
      couponOk.type === 1
        ? Math.max(0, currentPrice - (currentPrice * couponOk.value) / 100)
        : Math.max(0, currentPrice - couponOk.value);
  }

  const currentLabel = PERIODS.find((p) => p.key === period)?.label ?? "";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      {/* left column */}
      <div className="flex flex-col gap-4">
        <Card className="rounded border-slate-200 p-6">
          <div className="text-xl font-medium text-slate-800">{data.name}</div>
          {data.content ? (
            <div
              className="prose prose-sm mt-3 max-w-none whitespace-pre-wrap text-slate-600"
              dangerouslySetInnerHTML={{ __html: data.content }}
            />
          ) : null}
        </Card>

        <Card className="rounded border-slate-200 p-0 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-3 text-sm font-medium text-slate-700">
            付款周期
          </div>
          <div className="flex flex-col">
            {offered.map((p) => {
              const price = data[p.key] as number;
              const active = period === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    "flex items-center justify-between border-b border-slate-100 px-6 py-4 text-sm text-left transition-colors last:border-0 hover:bg-slate-50",
                    active && "bg-primary/5 ring-1 ring-primary/40"
                  )}
                >
                  <span className={active ? "text-primary font-medium" : "text-slate-700"}>
                    {p.label}
                  </span>
                  <span className={active ? "text-primary font-medium" : "text-slate-700"}>
                    ¥ {formatCny(price)}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* right column */}
      <div className="flex flex-col gap-4">
        <Card className="rounded border-slate-200 p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-700">
            <span>有优惠券?</span>
            <Button
              size="sm"
              onClick={() => verifyCoupon.mutate()}
              disabled={!coupon || verifyCoupon.isPending}
            >
              <Ticket className="size-4" />
              验证
            </Button>
          </div>
          <div className="px-4 py-3">
            <Input
              value={coupon}
              onChange={(e) => {
                setCoupon(e.target.value);
                setCouponOk(null);
              }}
              placeholder="输入优惠券代码"
            />
            {couponOk ? (
              <div className="mt-2 text-xs text-emerald-600">
                优惠 {couponOk.type === 1 ? `${couponOk.value}%` : `¥ ${formatCny(couponOk.value)}`}
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="rounded bg-slate-100 border-slate-200 p-0 overflow-hidden">
          <div className="border-b border-slate-200/80 px-4 py-3 text-sm font-medium text-slate-700">
            订单总额
          </div>
          <div className="flex justify-between px-4 py-3 text-sm">
            <span className="text-slate-700">
              {data.name}
              {currentLabel ? ` x ${currentLabel}` : ""}
            </span>
            <span className="text-slate-700">
              ¥ {currentPrice == null ? "—" : formatCny(currentPrice)}
            </span>
          </div>
          {couponOk && currentPrice ? (
            <div className="flex justify-between border-t border-slate-200/80 px-4 py-3 text-sm">
              <span className="text-emerald-600">优惠券抵扣</span>
              <span className="text-emerald-600">
                - ¥ {formatCny(currentPrice - discounted)}
              </span>
            </div>
          ) : null}
          <div className="border-t border-slate-200/80 px-4 py-3 text-sm font-medium text-slate-700">
            总计
          </div>
          <div className="px-4 pb-4">
            <div className="text-3xl font-medium text-slate-800">
              ¥ {currentPrice == null ? "—" : formatCny(discounted)}{" "}
              <span className="text-base font-normal text-slate-500">CNY</span>
            </div>
            <Button
              className="mt-4 w-full"
              onClick={() => create.mutate()}
              disabled={create.isPending || !period}
            >
              <CheckCircle2 className="size-4" />
              {create.isPending ? "提交中…" : "下单"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
