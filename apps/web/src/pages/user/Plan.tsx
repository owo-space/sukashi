import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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

function lowestPrice(p: Plan): { value: number; period: string } | null {
  for (const { key, label } of PERIODS) {
    const v = p[key] as number | null | undefined;
    if (v && v > 0) return { value: v, period: label };
  }
  return null;
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
    <div className="flex flex-col gap-5">
      <h2 className="text-2xl font-medium">选择最适合您的计划</h2>

      <div className="inline-flex w-fit rounded-full bg-muted p-1 text-sm">
        {([
          { k: "all" as const, label: "全部" },
          { k: "period" as const, label: "按周期" },
          { k: "traffic" as const, label: "按流量" }
        ]).map((opt) => (
          <button
            key={opt.k}
            onClick={() => setFilter(opt.k)}
            className={cn(
              "px-4 py-1.5 rounded-full transition-colors",
              filter === opt.k
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plan) => {
            const price = lowestPrice(plan);
            return (
              <Card key={plan.id} className="overflow-hidden">
                <div className="bg-card px-5 py-4 border-b">
                  <div className="text-lg font-medium">{plan.name}</div>
                </div>
                <div className="bg-muted/40 px-5 py-6 flex items-baseline gap-1">
                  <span className="text-3xl font-medium">¥</span>
                  <span className="text-4xl font-medium">
                    {price ? formatCny(price.value) : "—"}
                  </span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {price?.period ?? ""}
                  </span>
                </div>
                <div className="px-5 py-3">
                  <Button onClick={() => navigate(`/plan/${plan.id}`)}>立即订阅</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
