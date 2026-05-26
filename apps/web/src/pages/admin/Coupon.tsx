import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus } from "lucide-react";
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
  created_at?: number;
}

function isoToUnix(s: string): number {
  if (!s) return 0;
  return Math.floor(new Date(s).getTime() / 1000);
}
function unixToDateISO(u: number | null | undefined): string {
  if (!u) return "";
  return new Date(u * 1000).toISOString().slice(0, 10);
}

export function AdminCouponPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.coupon.fetch"],
    queryFn: () => apiGet<Coupon[]>("/admin/coupon/fetch")
  });

  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  function openCreate() {
    setForm({ type: "1", value: 10, generate_count: 1, show: 1 });
    setMode("create");
  }
  function openEdit(c: Coupon) {
    setForm({
      id: c.id,
      name: c.name,
      code: c.code,
      type: String(c.type),
      value: c.value,
      limit_use: c.limit_use ?? "",
      limit_use_with_user: c.limit_use_with_user ?? "",
      started_at: unixToDateISO(c.started_at),
      ended_at: unixToDateISO(c.ended_at),
      show: c.show ? 1 : 0
    });
    setMode("edit");
  }

  const generate = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { ...form };
      payload.type = Number(form.type);
      payload.value = Number(form.value ?? 0);
      payload.generate_count = Number(form.generate_count ?? 1);
      payload.show = form.show ? 1 : 0;
      if (typeof payload.started_at === "string") payload.started_at = isoToUnix(payload.started_at);
      if (typeof payload.ended_at === "string") payload.ended_at = isoToUnix(payload.ended_at);
      return apiPost("/admin/coupon/generate", payload);
    },
    onSuccess: () => {
      toast.success("已生成");
      setMode(null);
      qc.invalidateQueries({ queryKey: ["admin.coupon.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { ...form };
      payload.type = Number(form.type);
      payload.value = Number(form.value ?? 0);
      payload.show = form.show ? 1 : 0;
      if (payload.limit_use === "" || payload.limit_use === undefined) payload.limit_use = null;
      else payload.limit_use = Number(payload.limit_use);
      if (payload.limit_use_with_user === "" || payload.limit_use_with_user === undefined) {
        payload.limit_use_with_user = null;
      } else payload.limit_use_with_user = Number(payload.limit_use_with_user);
      if (typeof payload.started_at === "string") payload.started_at = isoToUnix(payload.started_at);
      if (typeof payload.ended_at === "string") payload.ended_at = isoToUnix(payload.ended_at);
      return apiPost("/admin/coupon/save", payload);
    },
    onSuccess: () => {
      toast.success("已保存");
      setMode(null);
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

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    toast.success(`已复制 ${code}`);
  }

  return (
    <>
      <Card className="rounded">
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b border-slate-100">
            <Button size="sm" variant="outline" className="h-9 gap-1" onClick={openCreate}>
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
                <TableHead className="text-slate-500">创建时间</TableHead>
                <TableHead className="text-right text-slate-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((c) => (
                  <TableRow key={c.id} className="border-b border-slate-100">
                    <TableCell className="text-slate-600">{c.id}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => copyCode(c.code)}
                        className="inline-flex items-center gap-1.5 rounded font-mono text-xs text-slate-700 hover:text-primary"
                        title="点击复制"
                      >
                        {c.code}
                        <Copy className="size-3 text-slate-400" />
                      </button>
                    </TableCell>
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
                    <TableCell className="text-xs text-slate-500">
                      {c.created_at ? formatUnixDate(c.created_at) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        <DropdownMenuItem onClick={() => openEdit(c)}>编辑</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyCode(c.code)}>
                          复制代码
                        </DropdownMenuItem>
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
        open={mode !== null}
        onOpenChange={(o) => !o && setMode(null)}
        title={mode === "edit" ? "编辑优惠券" : "生成优惠券"}
        submitting={generate.isPending || save.isPending}
        submitLabel={mode === "edit" ? "保存" : "生成"}
        onSubmit={() => (mode === "edit" ? save.mutate() : generate.mutate())}
      >
        <div className="flex flex-col gap-3">
          <Field label="名称" required>
            <Input
              value={String(form.name ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          {mode === "edit" ? (
            <Field label="代码">
              <Input
                value={String(form.code ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </Field>
          ) : (
            <Field label="生成数量" required>
              <Input
                type="number"
                value={String(form.generate_count ?? "")}
                onChange={(e) =>
                  setForm((f) => ({ ...f, generate_count: Number(e.target.value) }))
                }
              />
            </Field>
          )}
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
                onChange={(e) => setForm((f) => ({ ...f, limit_use: e.target.value }))}
              />
            </Field>
            <Field label="单用户上限">
              <Input
                type="number"
                value={String(form.limit_use_with_user ?? "")}
                onChange={(e) =>
                  setForm((f) => ({ ...f, limit_use_with_user: e.target.value }))
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
