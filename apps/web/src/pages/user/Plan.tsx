import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Radio, Skeleton, Tag, Typography } from "antd";
import { apiGet } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import type { Plan } from "@/lib/types";

type FilterKey = "all" | "period" | "traffic";

const PERIODS: Array<{ key: keyof Plan; label: string }> = [
  { key: "month_price", label: "月付" },
  { key: "quarter_price", label: "季付" },
  { key: "half_year_price", label: "半年付" },
  { key: "year_price", label: "年付" },
  { key: "two_year_price", label: "两年付" },
  { key: "three_year_price", label: "三年付" },
  { key: "onetime_price", label: "一次性" }
];

function lowestPrice(plan: Plan): { label: string; price: number } | null {
  for (const p of PERIODS) {
    const v = plan[p.key];
    if (typeof v === "number" && v >= 0) {
      return { label: p.label, price: v };
    }
  }
  return null;
}

export function PlanPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["user", "plan", "fetch"],
    queryFn: () => apiGet<Plan[]>("/user/plan/fetch")
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "period") {
      return data.filter((p) => p.month_price != null || p.quarter_price != null);
    }
    if (filter === "traffic") {
      return data.filter((p) => p.onetime_price != null);
    }
    return data;
  }, [data, filter]);

  return (
    <div style={{ padding: "8px 4px" }}>
      <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 24, fontWeight: 500 }}>
        选择最适合您的计划
      </Typography.Title>

      <Radio.Group
        value={filter}
        onChange={(e) => setFilter(e.target.value as FilterKey)}
        optionType="button"
        buttonStyle="solid"
        style={{ marginBottom: 24, borderRadius: 999 }}
        options={[
          { value: "all", label: "全部" },
          { value: "period", label: "按周期" },
          { value: "traffic", label: "按流量" }
        ]}
      />

      {isLoading ? (
        <Skeleton active />
      ) : filtered.length === 0 ? (
        <EmptyState title="暂时没有任何可购的计划" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>
          {filtered.map((plan) => {
            const soldOut = plan.capacity_limit !== null && plan.capacity_limit <= 0;
            const cheap = lowestPrice(plan);
            return (
              <div
                key={plan.id}
                style={{
                  background: "#fff",
                  borderRadius: 4,
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                }}
              >
                <div
                  style={{
                    padding: "16px 24px",
                    color: "rgba(0,0,0,0.85)",
                    fontSize: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <span>{plan.name}</span>
                  {soldOut ? <Tag>已售罄</Tag> : null}
                </div>

                <div
                  style={{
                    background: "#f5f6fa",
                    padding: "32px 24px",
                    display: "flex",
                    alignItems: "baseline",
                    gap: 12
                  }}
                >
                  <span style={{ fontSize: 18, color: "rgba(0,0,0,0.85)" }}>¥</span>
                  <span style={{ fontSize: 40, fontWeight: 500, color: "rgba(0,0,0,0.85)" }}>
                    {cheap ? (cheap.price / 100).toFixed(2) : "—"}
                  </span>
                  <span style={{ fontSize: 14, color: "rgba(0,0,0,0.55)", marginLeft: 8 }}>
                    {cheap?.label ?? ""}
                  </span>
                </div>

                {plan.content ? (
                  <div
                    style={{
                      padding: "12px 24px",
                      color: "rgba(0,0,0,0.65)",
                      fontSize: 13,
                      borderTop: "1px solid #f0f0f0"
                    }}
                    dangerouslySetInnerHTML={{ __html: plan.content }}
                  />
                ) : null}

                <div style={{ padding: "16px 24px" }}>
                  <button
                    type="button"
                    disabled={soldOut}
                    onClick={() => navigate(`/plan/${plan.id}`)}
                    style={{
                      background: soldOut ? "rgba(0,0,0,0.15)" : "#3b5998",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "6px 18px",
                      cursor: soldOut ? "not-allowed" : "pointer",
                      fontSize: 14
                    }}
                  >
                    {soldOut ? "已售罄" : "立即订阅"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

