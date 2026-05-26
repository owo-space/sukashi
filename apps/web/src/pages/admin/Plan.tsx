import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { FormDialog, type FieldDef } from "@/components/admin/FormDialog";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatCny } from "@/lib/format";
import type { Plan } from "@/lib/types";

interface AdminPlan extends Plan {
  count?: number;
  group_id?: number | null;
  group?: { id: number; name: string } | null;
}

interface ServerGroup {
  id: number;
  name: string;
}

const PERIOD_KEYS = [
  "month_price",
  "quarter_price",
  "half_year_price",
  "year_price",
  "two_year_price",
  "three_year_price",
  "onetime_price"
] as const;

export function AdminPlanPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.plan.fetch"],
    queryFn: () => apiGet<AdminPlan[]>("/admin/plan/fetch")
  });
  const groups = useQuery({
    queryKey: ["admin.server.group.fetch"],
    queryFn: () => apiGet<ServerGroup[]>("/admin/server/group/fetch")
  });

  const [editing, setEditing] = useState<Partial<AdminPlan> | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const toggleShow = useMutation({
    mutationFn: (p: AdminPlan) => apiPost("/admin/plan/update", { id: p.id, show: p.show ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.plan.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });
  const toggleRenew = useMutation({
    mutationFn: (p: AdminPlan) => apiPost("/admin/plan/update", { id: p.id, renew: p.renew ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.plan.fetch"] })
  });
  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost("/admin/plan/save", input),
    onSuccess: () => {
      toast.success("已保存");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.plan.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/plan/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.plan.fetch"] })
  });

  const fields: FieldDef[] = [
    { key: "name", label: "名称", required: true },
    {
      key: "group_id",
      label: "权限组",
      type: "select",
      options: (groups.data ?? []).map((g) => ({ value: String(g.id), label: g.name })),
      required: true
    },
    { key: "transfer_enable", label: "流量 (GB)", type: "number", required: true },
    { key: "device_limit", label: "设备限制", type: "number" },
    { key: "speed_limit", label: "限速 (Mbps)", type: "number" },
    { key: "capacity_limit", label: "容量上限 (人)", type: "number" },
    { key: "month_price", label: "月付 (CNY)", type: "number" },
    { key: "quarter_price", label: "季付", type: "number" },
    { key: "half_year_price", label: "半年付", type: "number" },
    { key: "year_price", label: "年付", type: "number" },
    { key: "two_year_price", label: "两年付", type: "number" },
    { key: "three_year_price", label: "三年付", type: "number" },
    { key: "onetime_price", label: "一次性", type: "number" },
    { key: "reset_price", label: "流量重置价格", type: "number" },
    { key: "reset_traffic_method", label: "流量重置方法 (0/1/2)", type: "number" },
    { key: "show", label: "对外显示", type: "switch" },
    { key: "renew", label: "允许续费", type: "switch" },
    { key: "content", label: "套餐内容(描述)", type: "textarea", span: 2 }
  ];

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-3 py-3">
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing({});
                setValues({ show: 1, renew: 1, transfer_enable: 100 });
              }}
            >
              <Plus className="size-4" />
              添加订阅
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>销售状态</TableHead>
                <TableHead>续费</TableHead>
                <TableHead>名称</TableHead>
                <TableHead>统计</TableHead>
                <TableHead>流量</TableHead>
                <TableHead>设备</TableHead>
                <TableHead>月付</TableHead>
                <TableHead>季付</TableHead>
                <TableHead>半年付</TableHead>
                <TableHead>年付</TableHead>
                <TableHead>两年付</TableHead>
                <TableHead>三年付</TableHead>
                <TableHead>一次性</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={14}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((p) => (
                  <TableRow key={p.id}>
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
                    {PERIOD_KEYS.map((k) => {
                      const v = p[k] as number | null | undefined;
                      return <TableCell key={k}>{v && v > 0 ? formatCny(v) : "—"}</TableCell>;
                    })}
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(p);
                          setValues({
                            id: p.id,
                            name: p.name,
                            group_id: p.group_id ? String(p.group_id) : "",
                            transfer_enable: p.transfer_enable,
                            device_limit: p.device_limit ?? "",
                            speed_limit: p.speed_limit ?? "",
                            capacity_limit: p.capacity_limit ?? "",
                            month_price: p.month_price ?? "",
                            quarter_price: p.quarter_price ?? "",
                            half_year_price: p.half_year_price ?? "",
                            year_price: p.year_price ?? "",
                            two_year_price: p.two_year_price ?? "",
                            three_year_price: p.three_year_price ?? "",
                            onetime_price: p.onetime_price ?? "",
                            reset_price: p.reset_price ?? "",
                            reset_traffic_method: p.reset_traffic_method ?? "",
                            show: p.show ? 1 : 0,
                            renew: p.renew ? 1 : 0,
                            content: p.content ?? ""
                          });
                        }}
                      >
                        <Pencil className="size-4" />
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`删除订阅 "${p.name}"？`)) drop.mutate(p.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing && "id" in editing ? "编辑订阅" : "添加订阅"}
        fields={fields}
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        onSubmit={() => save.mutate(values)}
        submitting={save.isPending}
        size="lg"
      />
    </>
  );
}
