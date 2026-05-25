import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Alert, Button, Card, FieldError, Form, Input, Label, ListBox, Select, Skeleton, TextField } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
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
    onSuccess: (tradeNo) => {
      navigate(`/order/${tradeNo}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "下单失败";
      setError(msg);
    }
  });

  if (isLoading) {
    return <Skeleton className="h-80 w-full rounded-xl" />;
  }
  if (!plan) {
    return (
      <>
        <PageHeader title="订阅详情" />
        <Alert variant="danger">订阅不存在或已下架</Alert>
      </>
    );
  }

  const availablePeriods = PERIODS.filter((p) => plan[p.key] !== null && plan[p.key] !== undefined);
  const currentPrice = (plan[period as keyof Plan] as number | null) ?? 0;

  return (
    <>
      <PageHeader title={plan.name} description="选择购买周期和优惠券，下单后即可付款。" />
      <Card>
        <Card.Content>
          {plan.content ? (
            <div
              className="prose prose-sm mb-4 max-w-none"
              dangerouslySetInnerHTML={{ __html: plan.content }}
            />
          ) : null}
          <div className="mb-4 text-sm text-muted">
            {bytesToGB(plan.transfer_enable * 1024 ** 3).toFixed(0)} GB 流量
            {plan.device_limit ? ` · ${plan.device_limit} 台设备` : ""}
            {plan.speed_limit ? ` · ${plan.speed_limit} Mbps` : ""}
          </div>

          {error ? (
            <Alert variant="danger" className="mb-4" title="下单失败">
              {error}
            </Alert>
          ) : null}

          <Form
            className="flex max-w-md flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              buy.mutate();
            }}
          >
            <Select
              selectedKey={period}
              onSelectionChange={(k) => setPeriod(String(k))}
            >
              <Label>购买周期</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {availablePeriods.map((p) => (
                    <ListBox.Item key={p.key} id={String(p.key)} textValue={p.label}>
                      <span className="flex w-full justify-between gap-3">
                        <span>{p.label}</span>
                        <span className="font-medium">
                          {formatCents(plan[p.key] as number)}
                        </span>
                      </span>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <TextField value={couponCode} onChange={setCouponCode}>
              <Label>优惠券码（可选）</Label>
              <Input placeholder="如有优惠券请填写" />
              <FieldError />
            </TextField>

            <div className="flex items-end justify-between rounded-md bg-default-100 px-3 py-2">
              <span className="text-sm text-muted">应付</span>
              <span className="text-xl font-semibold">{formatCents(currentPrice)}</span>
            </div>

            <Button type="submit" isPending={buy.isPending}>
              立即下单
            </Button>
          </Form>
        </Card.Content>
      </Card>
    </>
  );
}
