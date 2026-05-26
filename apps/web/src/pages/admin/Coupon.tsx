import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { RowActions } from "@/components/admin/RowActions";
import { DataDrawer } from "@/components/admin/DataDrawer";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatCny, formatUnixDate } from "@/lib/format";

interface Coupon {
  id: number;
  code: string;
  name: string;
  type: number;
  value: number;
  show: boolean | number;
  limit_use: number | null;
  limit_use_with_user: number | null;
  started_at: number;
  ended_at: number;
}

function isoToUnix(s: string): number {
  if (!s) return 0;
  return Math.floor(new Date(s).getTime() / 1000);
}

export function AdminCouponPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.coupon.fetch"],
    queryFn: () => apiGet<Coupon[]>("/admin/coupon/fetch")
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({
    type: "1",
    value: 10,
    generate_count: 1,
    show: 1
  });

  const generate = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { ...form };
      payload.type = Number(form.type);
      payload.value = Number(form.value ?? 0);
      payload.generate_count = Number(form.generate_count ?? 1);
      payload.show = form.show ? 1 : 0;
      if (typeof payload.started_at === "string")
        payload.started_at = isoToUnix(payload.started_at as string);
      if (typeof payload.ended_at === "string")
        payload.ended_at = isoToUnix(payload.ended_at as string);
      return apiPost("/admin/coupon/generate", payload);
    },
    onSuccess: () => {
      toast.success("已生成");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin.coupon.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const showToggle = useMutation({
    mutationFn: (c: Coupon) =>
      apiPost("/admin/coupon/show", { id: c.id, show: c.show ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.coupon.fetch"] })
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/coupon/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.coupon.fetch"] })
  });

  return (
    <>
      <Card className="rounded">
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-slate-100">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1"
              onClick={() => {
                setForm({ type: "1", value: 10, generate_count: 1, show: 1 });
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              生成优惠券
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="text-slate-500">ID</TableHead>
                <TableHead className="text-slate-500">名称</TableHead>
                <TableHead className="text-slate-500">代码</TableHead>
                <TableHead className="text-slate-500">类型</TableHead>
                <TableHead className="text-slate-500">数值</TableHead>
                <TableHead className="text-slate-500">显示</TableHead>
                <TableHead className="text-slate-500">有效期</TableHead>
                <TableHead className="text-right text-slate-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((c) => (
                  <TableRow key={c.id} className="border-b border-slate-100">
                    <TableCell className="text-slate-600">{c.id}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell>
                    <TableCell className="text-slate-600">
                      {c.type === 1 ? "百分比" : "固定金额"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {c.type === 1 ? `${c.value}%` : `¥ ${formatCny(c.value)}`}
                    </TableCell>
                    <TableCell>
                      <Switch checked={Boolean(c.show)} onCheckedChange={() => showToggle.mutate(c)} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatUnixDate(c.started_at)} ~ {formatUnixDate(c.ended_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`删除优惠券 "${c.name}"？`)) drop.mutate(c.id);
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
        open={open}
        onOpenChange={setOpen}
        title="生成优惠券"
        submitting={generate.isPending}
        onSubmit={() => generate.mutate()}
      >
        <div className="flex flex-col gap-3">
          <Field label="名称" required>
            <Input
              value={String(form.name ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="生成数量" required>
              <Input
                type="number"
                value={String(form.generate_count ?? "")}
                onChange={(e) =>
                  setForm((f) => ({ ...f, generate_count: Number(e.target.value) }))
                }
              />
            </Field>
            <Field label="类型" required>
              <Select
                value={String(form.type ?? "1")}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">百分比</SelectItem>
                  <SelectItem value="2">固定金额 (分)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="数值" required>
            <Input
              type="number"
              value={String(form.value ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="总使用上限">
              <Input
                type="number"
                value={String(form.limit_use ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, limit_use: Number(e.target.value) }))}
              />
            </Field>
            <Field label="单用户上限">
              <Input
                type="number"
                value={String(form.limit_use_with_user ?? "")}
                onChange={(e) =>
                  setForm((f) => ({ ...f, limit_use_with_user: Number(e.target.value) }))
                }
              />
            </Field>
          </div>
          <Field label="开始日期" required>
            <Input
              type="date"
              value={String(form.started_at ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, started_at: e.target.value }))}
            />
          </Field>
          <Field label="结束日期" required>
            <Input
              type="date"
              value={String(form.ended_at ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, ended_at: e.target.value }))}
            />
          </Field>
          <Field label="对外显示">
            <Switch
              checked={Boolean(form.show)}
              onCheckedChange={(c) => setForm((f) => ({ ...f, show: c ? 1 : 0 }))}
            />
          </Field>
        </div>
      </DataDrawer>
    </>
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
      <span className="text-sm">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </span>
      {children}
    </div>
  );
}
