import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";
import { formatCny } from "@/lib/format";
import type { Plan } from "@/lib/types";

type Filter = "all" | "period" | "traffic";

const PERIODS: Array<{ key: keyof Plan; label: string }> = [
  { key: "month_price", label: "月付" },
  { key: "quarter_price", label: "季付" },
  { key: "half_year_price", label: "半年付" },
  { key: "year_price", label: "年付" },
  { key: "two_year_price", label: "两年付" },
  { key: "three_year_price", label: "三年付" },
  { key: "onetime_price", label: "一次性" }
];

function availablePrices(p: Plan): Array<{ key: string; label: string; value: number }> {
  return PERIODS.flatMap(({ key, label }) => {
    const v = p[key] as number | null | undefined;
    return v != null && v > 0 ? [{ key: String(key), label, value: v }] : [];
  });
}

function isPeriodPlan(p: Plan): boolean {
  return PERIODS.slice(0, 6).some((k) => {
    const v = p[k.key] as number | null | undefined;
    return v != null && v > 0;
  });
}

function isTrafficPlan(p: Plan): boolean {
  return Boolean(p.onetime_price && p.onetime_price > 0);
}

export function UserPlanPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading } = useQuery({
    queryKey: ["user.plan.fetch"],
    queryFn: () => apiGet<Plan[]>("/user/plan/fetch")
  });

  const filtered = (data ?? []).filter((p) => {
    if (filter === "period") return isPeriodPlan(p);
    if (filter === "traffic") return isTrafficPlan(p);
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-medium text-slate-800">选择最适合您的计划</h2>

      <div className="inline-flex w-fit rounded-full bg-white p-1 text-sm border border-slate-200">
        {(
          [
            { k: "all" as const, label: "全部" },
            { k: "period" as const, label: "按周期" },
            { k: "traffic" as const, label: "按流量" }
          ]
        ).map((opt) => (
          <button
            key={opt.k}
            onClick={() => setFilter(opt.k)}
            className={cn(
              "px-5 py-1 rounded-full transition-colors",
              filter === opt.k ? "bg-primary text-primary-foreground" : "text-slate-600 hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded">
          <div className="p-6">
            <EmptyState />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plan) => {
            const prices = availablePrices(plan);
            return (
              <Card key={plan.id} className="flex flex-col overflow-hidden rounded border-slate-200">
                <div className="border-b border-slate-100 bg-white px-5 py-4">
                  <div className="text-lg font-medium text-slate-800">{plan.name}</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>
                      流量{" "}
                      <span className="font-medium text-slate-700">
                        {plan.transfer_enable} GB
                      </span>
                    </span>
                    {plan.device_limit ? (
                      <span>
                        设备{" "}
                        <span className="font-medium text-slate-700">{plan.device_limit}</span>
                      </span>
                    ) : null}
                    {plan.speed_limit ? (
                      <span>
                        限速{" "}
                        <span className="font-medium text-slate-700">
                          {plan.speed_limit} Mbps
                        </span>
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-1.5 bg-slate-50 px-5 py-4 text-sm">
                  {prices.length === 0 ? (
                    <span className="text-slate-400">暂无可选周期</span>
                  ) : (
                    prices.map((p) => (
                      <div key={p.key} className="flex items-baseline justify-between">
                        <span className="text-slate-600">{p.label}</span>
                        <span className="font-medium text-slate-800">
                          <span className="text-xs text-slate-500">¥ </span>
                          {formatCny(p.value)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-slate-100 bg-white px-5 py-3">
                  <Button onClick={() => navigate(`/plan/${plan.id}`)} className="w-full">
                    立即订阅
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
