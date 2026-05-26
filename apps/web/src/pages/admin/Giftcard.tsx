import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DateTimePicker } from "@/components/ui/datetime-picker";
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

interface Giftcard {
  id: number;
  name: string;
  code: string;
  type: number;
  value: number | null;
  plan_id: number | null;
  limit_use: number | null;
  started_at: number;
  ended_at: number;
  created_at: number;
}

function isoToUnix(s: string): number {
  if (!s) return 0;
  return Math.floor(new Date(s).getTime() / 1000);
}

export function AdminGiftcardPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.giftcard.fetch"],
    queryFn: () => apiGet<Giftcard[]>("/admin/giftcard/fetch")
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>({
    type: "1",
    generate_count: 1
  });

  const generate = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { ...form };
      payload.type = Number(form.type);
      payload.generate_count = Number(form.generate_count ?? 1);
      if (form.value != null && form.value !== "") payload.value = Number(form.value);
      if (form.plan_id != null && form.plan_id !== "") payload.plan_id = Number(form.plan_id);
      if (typeof payload.started_at === "string")
        payload.started_at = isoToUnix(payload.started_at as string);
      if (typeof payload.ended_at === "string")
        payload.ended_at = isoToUnix(payload.ended_at as string);
      return apiPost("/admin/giftcard/generate", payload);
    },
    onSuccess: () => {
      toast.success("已生成");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin.giftcard.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/giftcard/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.giftcard.fetch"] })
  });

  return (
    <>
      <Card className="rounded">
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b border-slate-100">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1"
              onClick={() => {
                setForm({ type: "1", generate_count: 1 });
                setOpen(true);
              }}
            >
              <Plus className="size-4" />
              生成礼品卡
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="text-slate-500">ID</TableHead>
                <TableHead className="text-slate-500">名称</TableHead>
                <TableHead className="text-slate-500">代码</TableHead>
                <TableHead className="text-slate-500">类型</TableHead>
                <TableHead className="text-slate-500">金额/Plan</TableHead>
                <TableHead className="text-slate-500">有效期</TableHead>
                <TableHead className="text-right text-slate-500">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : !data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((g) => (
                  <TableRow key={g.id} className="border-b border-slate-100">
                    <TableCell className="text-slate-600">{g.id}</TableCell>
                    <TableCell>{g.name}</TableCell>
                    <TableCell className="font-mono text-xs">{g.code}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded border border-slate-200 px-2 py-0.5 text-xs">
                        {g.type === 1 ? "余额" : "订阅"}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {g.type === 1 ? `¥ ${formatCny(g.value ?? 0)}` : `Plan #${g.plan_id ?? "-"}`}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatUnixDate(g.started_at)} ~ {formatUnixDate(g.ended_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`删除 "${g.code}"？`)) drop.mutate(g.id);
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
        title="生成礼品卡"
        submitting={generate.isPending}
        onSubmit={() => generate.mutate()}
        submitLabel="生成"
      >
        <div className="flex flex-col gap-3">
          <Field label="礼品卡名称" required>
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
                  <SelectItem value="1">余额 (CNY 分)</SelectItem>
                  <SelectItem value="2">订阅 (Plan)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          {String(form.type) === "1" ? (
            <Field label="金额 (分)">
              <Input
                type="number"
                value={String(form.value ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              />
            </Field>
          ) : (
            <Field label="Plan ID">
              <Input
                type="number"
                value={String(form.plan_id ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
              />
            </Field>
          )}
          <Field label="使用上限 (留空不限)">
            <Input
              type="number"
              value={String(form.limit_use ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, limit_use: Number(e.target.value) }))}
            />
          </Field>
          <Field label="开始时间" required>
            <DateTimePicker
              value={String(form.started_at ?? "")}
              onChange={(v) => setForm((f) => ({ ...f, started_at: v }))}
            />
          </Field>
          <Field label="结束时间" required>
            <DateTimePicker
              value={String(form.ended_at ?? "")}
              onChange={(v) => setForm((f) => ({ ...f, ended_at: v }))}
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
