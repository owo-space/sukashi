import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Chip, Skeleton } from "@heroui/react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
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

  if (isLoading) {
    return (
      <>
        <PageHeader title="购买订阅" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-60 w-full rounded-xl" />
          ))}
        </div>
      </>
    );
  }

  if (!data || data.length === 0) {
    return (
      <>
        <PageHeader title="购买订阅" />
        <EmptyState
          title="暂时没有任何可购的计划"
          description="管理员尚未上架订阅，请稍后再试或联系客服。"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="购买订阅" description="选择最适合你的计划。" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((plan) => {
          const soldOut = plan.capacity_limit !== null && plan.capacity_limit <= 0;
          const availablePeriods = PERIODS.filter(
            (p) => plan[p.key] !== null && plan[p.key] !== undefined
          );
          return (
            <Card key={plan.id} className="flex flex-col">
              <Card.Header>
                <div className="flex items-start justify-between gap-2">
                  <Card.Title>{plan.name}</Card.Title>
                  {soldOut ? (
                    <Chip variant="default" color="default">已售罄</Chip>
                  ) : plan.capacity_limit !== null && plan.capacity_limit <= 5 ? (
                    <Chip variant="default" color="warning">仅剩 {plan.capacity_limit}</Chip>
                  ) : null}
                </div>
                {plan.content ? (
                  <div
                    className="prose prose-sm mt-2 max-w-none text-sm text-muted"
                    dangerouslySetInnerHTML={{ __html: plan.content }}
                  />
                ) : null}
              </Card.Header>
              <Card.Content className="flex-1">
                <div className="mb-3 text-sm text-muted">
                  {bytesToGB(plan.transfer_enable * 1024 ** 3).toFixed(0)} GB 流量
                  {plan.device_limit ? ` · ${plan.device_limit} 台设备` : ""}
                  {plan.speed_limit ? ` · ${plan.speed_limit} Mbps` : ""}
                </div>
                <ul className="space-y-1 text-sm">
                  {availablePeriods.slice(0, 4).map((p) => (
                    <li key={p.key} className="flex justify-between">
                      <span className="text-muted">{p.label}</span>
                      <span className="font-medium">
                        {formatCents(plan[p.key] as number)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card.Content>
              <Card.Footer>
                <Button
                  className="w-full"
                  isDisabled={soldOut}
                  onPress={() => navigate(`/plan/${plan.id}`)}
                >
                  {soldOut ? "已售罄" : "查看详情"}
                </Button>
              </Card.Footer>
            </Card>
          );
        })}
      </div>
    </>
  );
}
