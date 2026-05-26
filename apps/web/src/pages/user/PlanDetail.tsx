import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { Plan } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { formatCny, formatBytes } from "@/lib/format";

const PERIOD_KEYS: Array<{ key: keyof Plan; period: string; label: string }> = [
  { key: "month_price", period: "month_price", label: "月付" },
  { key: "quarter_price", period: "quarter_price", label: "季付" },
  { key: "half_year_price", period: "half_year_price", label: "半年付" },
  { key: "year_price", period: "year_price", label: "年付" },
  { key: "two_year_price", period: "two_year_price", label: "两年付" },
  { key: "three_year_price", period: "three_year_price", label: "三年付" },
  { key: "onetime_price", period: "onetime_price", label: "一次性" }
];

export function UserPlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const planId = Number(id);
  const [period, setPeriod] = useState<string>("");
  const [coupon, setCoupon] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["user.plan.detail", planId],
    queryFn: () =>
      apiGet<Plan>("/user/plan/fetch", { params: { id: planId } })
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!period) throw new Error("请选择购买周期");
      return apiPost<string>("/user/order/save", {
        plan_id: planId,
        period,
        coupon_code: coupon || undefined
      });
    },
    onSuccess: (tradeNo) => {
      toast.success("订单已创建");
      navigate(`/order/${tradeNo}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : (err as Error).message);
    }
  });

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;

  const offered = PERIOD_KEYS.filter((p) => {
    const v = data[p.key] as number | null | undefined;
    return v != null && v > 0;
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-medium">{data.name}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="text-muted-foreground">
            流量: {formatBytes(data.transfer_enable * 1024 * 1024 * 1024)}
          </div>
          {data.content ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground/80">
              {data.content}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">结算</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>选择周期</Label>
            <div className="flex flex-col gap-1">
              {offered.map((p) => {
                const price = data[p.key] as number;
                const active = period === p.period;
                return (
                  <button
                    key={p.period}
                    onClick={() => setPeriod(p.period)}
                    className={`flex justify-between items-center px-3 py-2 rounded border text-sm transition-colors ${
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/60"
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="font-medium">¥ {formatCny(price)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon">优惠码</Label>
            <Input id="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
          </div>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !period}>
            {create.isPending ? "提交中…" : "提交订单"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
