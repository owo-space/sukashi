import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, HelpCircle, Plus, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/EmptyState";
import { DataDrawer } from "@/components/admin/DataDrawer";
import { RowActions } from "@/components/admin/RowActions";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatCny } from "@/lib/format";
import type { Plan } from "@/lib/types";

interface AdminPlan extends Plan {
  count?: number;
  group?: { id: number; name: string } | null;
}

interface ServerGroup {
  id: number;
  name: string;
}

const PRICE_COLS: Array<[keyof Plan, string]> = [
  ["month_price", "月付"],
  ["quarter_price", "季付"],
  ["half_year_price", "半年付"],
  ["year_price", "年付"],
  ["two_year_price", "两年付"],
  ["three_year_price", "三年付"],
  ["onetime_price", "一次性"]
];

function Help({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="size-3 text-muted-foreground" strokeWidth={1.75} />
        </TooltipTrigger>
        <TooltipContent>{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-foreground border-b border-border pb-2">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

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

  const [editing, setEditing] = useState<{ mode: "create" | "edit"; row?: AdminPlan } | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [forceUpdate, setForceUpdate] = useState(false);

  const toggle = useMutation({
    mutationFn: (input: { id: number; [k: string]: unknown }) =>
      apiPost("/admin/plan/update", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.plan.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });
  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const payload: Record<string, unknown> = { ...input, force_update: forceUpdate ? 1 : 0 };
      return apiPost("/admin/plan/save", payload);
    },
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

  function openCreate() {
    setEditing({ mode: "create" });
    setForm({ show: 1, renew: 1, transfer_enable: 100 });
    setForceUpdate(false);
  }
  function openEdit(p: AdminPlan) {
    setEditing({ mode: "edit", row: p });
    setForm({
      id: p.id,
      name: p.name,
      content: p.content ?? "",
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
      renew: p.renew ? 1 : 0
    });
    setForceUpdate(false);
  }

  return (
    <>
      <Card className="rounded">
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b border-border">
            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={openCreate}>
              <Plus className="size-4" />
              添加订阅
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-12 text-muted-foreground">排序</TableHead>
                <TableHead className="text-muted-foreground">销售状态</TableHead>
                <TableHead className="text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    续费 <Help>关闭后,订阅到期不可续费</Help>
                  </span>
                </TableHead>
                <TableHead className="text-muted-foreground">名称</TableHead>
                <TableHead className="text-muted-foreground">统计</TableHead>
                <TableHead className="text-muted-foreground">流量</TableHead>
                <TableHead className="text-muted-foreground">设备数限制</TableHead>
                {PRICE_COLS.map(([key, label]) => (
                  <TableHead key={key as string} className="text-muted-foreground">
                    {label}
                  </TableHead>
                ))}
                <TableHead className="text-right text-muted-foreground">操作</TableHead>
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
                  <TableRow key={p.id} className="border-b border-border">
                    <TableCell>
                      <GripVertical className="size-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={Boolean(p.show)}
                        onCheckedChange={() => toggle.mutate({ id: p.id, show: p.show ? 0 : 1 })}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={Boolean(p.renew)}
                        onCheckedChange={() =>
                          toggle.mutate({ id: p.id, renew: p.renew ? 0 : 1 })
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-foreground/80">
                        <User className="size-3" strokeWidth={1.75} />
                        {p.count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-foreground/80">{p.transfer_enable} GB</TableCell>
                    <TableCell className="text-foreground/80">{p.device_limit ?? "-"}</TableCell>
                    {PRICE_COLS.map(([key]) => {
                      const v = p[key] as number | null | undefined;
                      return (
                        <TableCell key={key as string} className="text-foreground/80">
                          {v && v > 0 ? formatCny(v) : "-"}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right">
                      <RowActions>
                        <DropdownMenuItem onClick={() => openEdit(p)}>编辑</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`删除订阅 "${p.name}"？`)) drop.mutate(p.id);
                          }}
                        >
                          删除
                        </DropdownMenuItem>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataDrawer
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.mode === "edit" ? "编辑订阅" : "新建订阅"}
        width={560}
        submitting={save.isPending}
        onSubmit={() => save.mutate(form)}
        extraLeft={
          <label className="flex items-center gap-2 text-sm text-foreground/80">
            <Checkbox
              checked={forceUpdate}
              onCheckedChange={(c) => setForceUpdate(Boolean(c))}
            />
            强制更新到用户
          </label>
        }
      >
        <div className="flex flex-col gap-4 pb-6">
          <Field label="套餐名称" required>
            <Input
              value={String(form.name ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="请输入套餐名称"
            />
          </Field>
          <Field label="套餐描述">
            <Textarea
              rows={3}
              value={String(form.content ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="请输入套餐描述,支持HTML"
            />
          </Field>
          <Section title="售价设置">
            <div className="grid grid-cols-3 gap-3">
              {PRICE_COLS.slice(0, 6).map(([key, label]) => (
                <Field key={key as string} label={label}>
                  <Input
                    type="number"
                    value={String(form[key as string] ?? "")}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value === "" ? "" : Number(e.target.value) }))
                    }
                  />
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="一次性">
                <Input
                  type="number"
                  value={String(form.onetime_price ?? "")}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      onetime_price: e.target.value === "" ? "" : Number(e.target.value)
                    }))
                  }
                />
              </Field>
              <Field label="重置包">
                <Input
                  type="number"
                  value={String(form.reset_price ?? "")}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      reset_price: e.target.value === "" ? "" : Number(e.target.value)
                    }))
                  }
                />
              </Field>
            </div>
          </Section>
          <Field label="套餐流量 (GB)" required>
            <Input
              type="number"
              value={String(form.transfer_enable ?? "")}
              onChange={(e) =>
                setForm((f) => ({ ...f, transfer_enable: Number(e.target.value) }))
              }
            />
          </Field>
          <Field label="设备数限制 (留空不限)">
            <Input
              type="number"
              value={String(form.device_limit ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, device_limit: e.target.value }))}
              placeholder="留空则不限制"
            />
          </Field>
          <Field label="权限组" required>
            <select
              className="h-9 rounded border border-input bg-background px-2 text-sm"
              value={String(form.group_id ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
            >
              <option value="">请选择权限组</option>
              {(groups.data ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="流量重置方式 (0 = 月初, 1 = 购买日, 2 = 不重置)">
            <Input
              type="number"
              value={String(form.reset_traffic_method ?? "")}
              onChange={(e) =>
                setForm((f) => ({ ...f, reset_traffic_method: e.target.value }))
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="对外显示">
              <Switch
                checked={Boolean(form.show)}
                onCheckedChange={(c) => setForm((f) => ({ ...f, show: c ? 1 : 0 }))}
              />
            </Field>
            <Field label="允许续费">
              <Switch
                checked={Boolean(form.renew)}
                onCheckedChange={(c) => setForm((f) => ({ ...f, renew: c ? 1 : 0 }))}
              />
            </Field>
          </div>
        </div>
      </DataDrawer>
    </>
  );
}
