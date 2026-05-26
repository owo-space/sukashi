import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatCny } from "@/lib/format";
import type { Plan } from "@/lib/types";

interface AdminPlan extends Plan {
  count?: number;
  group?: { id: number; name: string } | null;
}

export function AdminPlanPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.plan.fetch"],
    queryFn: () => apiGet<AdminPlan[]>("/admin/plan/fetch")
  });

  const toggleShow = useMutation({
    mutationFn: (p: AdminPlan) => apiPost("/admin/plan/update", { id: p.id, show: p.show ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.plan.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });
  const toggleRenew = useMutation({
    mutationFn: (p: AdminPlan) => apiPost("/admin/plan/update", { id: p.id, renew: p.renew ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.plan.fetch"] })
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div>
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            添加订阅
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>排序</TableHead>
              <TableHead>销售状态</TableHead>
              <TableHead>续费</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>统计</TableHead>
              <TableHead>流量</TableHead>
              <TableHead>设备限制</TableHead>
              <TableHead>月付</TableHead>
              <TableHead>季付</TableHead>
              <TableHead>半年付</TableHead>
              <TableHead>年付</TableHead>
              <TableHead>两年付</TableHead>
              <TableHead>三年付</TableHead>
              <TableHead>一次性</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={15}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="cursor-move text-muted-foreground">≡</TableCell>
                  <TableCell>
                    <Switch checked={Boolean(p.show)} onCheckedChange={() => toggleShow.mutate(p)} />
                  </TableCell>
                  <TableCell>
                    <Switch checked={Boolean(p.renew)} onCheckedChange={() => toggleRenew.mutate(p)} />
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Users className="size-3" />
                      {p.count ?? 0}
                    </span>
                  </TableCell>
                  <TableCell>{p.transfer_enable} GB</TableCell>
                  <TableCell>{p.device_limit ?? "—"}</TableCell>
                  {(
                    [
                      "month_price",
                      "quarter_price",
                      "half_year_price",
                      "year_price",
                      "two_year_price",
                      "three_year_price",
                      "onetime_price"
                    ] as const
                  ).map((k) => {
                    const v = p[k] as number | null | undefined;
                    return (
                      <TableCell key={k}>
                        {v && v > 0 ? formatCny(v) : "—"}
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <Button size="sm" variant="ghost">
                      操作
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
