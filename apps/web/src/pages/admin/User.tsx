import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Filter, Plus, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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
import { ApiError, apiGet, apiGetEnvelope, apiPost } from "@/lib/api";
import { formatCny, formatUnixDate } from "@/lib/format";
import type { Plan } from "@/lib/types";

interface AdminUser {
  id: number;
  email: string;
  token?: string;
  banned: number;
  is_admin?: number;
  is_staff?: number;
  plan_id: number | null;
  plan_name?: string | null;
  group_id?: number | null;
  group_name?: string | null;
  transfer_enable?: number;
  u?: number;
  d?: number;
  expired_at?: number | null;
  device_limit?: number | null;
  speed_limit?: number | null;
  balance: number;
  commission_balance: number;
  remarks?: string | null;
  created_at: number;
}

interface ServerGroup {
  id: number;
  name: string;
}

const PAGE_SIZES = [10, 20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];

function StatusTag({ banned }: { banned: number }) {
  return banned ? (
    <span className="inline-flex items-center rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-600">
      封禁
    </span>
  ) : (
    <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">
      正常
    </span>
  );
}

const GIB = 1024 ** 3;
function bytesToGb(b: number): number {
  return Math.round((b / GIB) * 100) / 100;
}
function gbToBytes(g: number): number {
  return Math.round(g * GIB);
}

export function AdminUserPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [filterBanned, setFilterBanned] = useState<"all" | "0" | "1">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin.user.fetch", page, pageSize, search, filterBanned],
    queryFn: () =>
      apiGetEnvelope<AdminUser[]>("/admin/user/fetch", {
        params: {
          current: page,
          pageSize,
          email: search || undefined,
          banned: filterBanned === "all" ? undefined : filterBanned
        }
      })
  });
  const plans = useQuery({
    queryKey: ["admin.plan.fetch"],
    queryFn: () => apiGet<Plan[]>("/admin/plan/fetch")
  });
  const groups = useQuery({
    queryKey: ["admin.server.group.fetch"],
    queryFn: () => apiGet<ServerGroup[]>("/admin/server/group/fetch")
  });

  const [editing, setEditing] = useState<{ mode: "create" | "edit"; row?: AdminUser } | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  function openCreate() {
    setEditing({ mode: "create" });
    setForm({
      email: "",
      password: "",
      plan_id: "",
      group_id: "",
      banned: 0,
      is_admin: 0,
      is_staff: 0
    });
  }
  function openEdit(u: AdminUser) {
    setEditing({ mode: "edit", row: u });
    setForm({
      id: u.id,
      email: u.email,
      password: "",
      plan_id: u.plan_id ? String(u.plan_id) : "",
      group_id: u.group_id ? String(u.group_id) : "",
      transfer_enable: bytesToGb(u.transfer_enable ?? 0),
      u: bytesToGb(u.u ?? 0),
      d: bytesToGb(u.d ?? 0),
      device_limit: u.device_limit ?? "",
      speed_limit: u.speed_limit ?? "",
      expired_at: u.expired_at ? new Date(u.expired_at * 1000).toISOString().slice(0, 16) : "",
      balance: u.balance ?? 0,
      commission_balance: u.commission_balance ?? 0,
      is_admin: u.is_admin ? 1 : 0,
      is_staff: u.is_staff ? 1 : 0,
      banned: u.banned ? 1 : 0,
      remarks: u.remarks ?? ""
    });
  }

  const update = useMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const payload: Record<string, unknown> = { ...input };
      if (typeof payload.expired_at === "string") {
        payload.expired_at = payload.expired_at
          ? Math.floor(new Date(payload.expired_at as string).getTime() / 1000)
          : null;
      }
      if (payload.password === "") delete payload.password;
      // The form stores transfer/u/d in GB but the API stores raw Bytes.
      for (const key of ["transfer_enable", "u", "d"] as const) {
        if (payload[key] !== "" && payload[key] != null) {
          payload[key] = gbToBytes(Number(payload[key]));
        }
      }
      return apiPost("/admin/user/update", payload);
    },
    onSuccess: () => {
      toast.success("已保存");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.user.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });
  const ban = useMutation({
    mutationFn: (u: AdminUser) => apiPost("/admin/user/ban", { id: u.id, banned: u.banned ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.user.fetch"] })
  });
  const drop = useMutation({
    mutationFn: (u: AdminUser) => apiPost("/admin/user/delUser", { id: u.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.user.fetch"] })
  });
  const resetSecret = useMutation({
    mutationFn: (u: AdminUser) => apiPost("/admin/user/resetSecret", { id: u.id }),
    onSuccess: () => toast.success("订阅信息已重置")
  });

  async function copySubscribeUrl(u: AdminUser) {
    if (!u.token) {
      toast.error("该用户缺少订阅令牌");
      return;
    }
    const url = `${window.location.origin}/api/v1/client/subscribe?token=${u.token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("订阅链接已复制");
    } catch {
      toast.error("复制失败,请手动复制");
    }
  }

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <Card className="rounded">
        <CardContent className="p-0">
          {/* toolbar */}
          <div className="flex items-center gap-1.5 px-6 py-3 border-b border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1">
                  <Filter className="size-4" />
                  过滤器
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40">
                <DropdownMenuLabel>状态</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setFilterBanned("all")}>
                  全部
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterBanned("0")}>正常</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterBanned("1")}>封禁</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-9 gap-1">
                  <Settings2 className="size-4" />
                  操作
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem disabled>批量发送邮件 (TODO)</DropdownMenuItem>
                <DropdownMenuItem disabled>导出 CSV (TODO)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" variant="outline" className="size-9" onClick={openCreate}>
              <Plus className="size-4" />
            </Button>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索邮箱"
              className="h-9 max-w-xs"
            />
            <span className="ml-auto text-xs text-muted-foreground">共 {total} 个用户</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="w-14 text-muted-foreground">ID</TableHead>
                <TableHead className="text-muted-foreground">邮箱</TableHead>
                <TableHead className="text-muted-foreground">状态</TableHead>
                <TableHead className="text-muted-foreground">订阅</TableHead>
                <TableHead className="text-muted-foreground">权限组</TableHead>
                <TableHead className="text-muted-foreground">已用 (G)</TableHead>
                <TableHead className="text-muted-foreground">流量 (G)</TableHead>
                <TableHead className="text-muted-foreground">设备数</TableHead>
                <TableHead className="text-muted-foreground">余额</TableHead>
                <TableHead className="text-muted-foreground">到期时间</TableHead>
                <TableHead className="text-right text-muted-foreground">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => {
                  const used = ((u.u ?? 0) + (u.d ?? 0)) / 1024 ** 3;
                  const transfer = (u.transfer_enable ?? 0) / 1024 ** 3;
                  return (
                    <TableRow key={u.id} className="border-b border-border">
                      <TableCell className="text-foreground/80">{u.id}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-sky-500" />
                          {u.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusTag banned={u.banned} />
                      </TableCell>
                      <TableCell className="text-foreground/80">{u.plan_name ?? "-"}</TableCell>
                      <TableCell className="text-foreground/80">{u.group_name ?? "-"}</TableCell>
                      <TableCell className="text-foreground/80">{used.toFixed(2)}</TableCell>
                      <TableCell className="text-foreground/80">{transfer.toFixed(2)}</TableCell>
                      <TableCell className="text-foreground/80">
                        {u.device_limit ?? "0 / ∞"}
                      </TableCell>
                      <TableCell className="text-foreground/80">¥ {formatCny(u.balance)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {u.expired_at == null ? "长期有效" : formatUnixDate(u.expired_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions>
                          <DropdownMenuItem onClick={() => openEdit(u)}>编辑</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => copySubscribeUrl(u)}>
                            复制订阅链接
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetSecret.mutate(u)}>
                            重置订阅
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => ban.mutate(u)}>
                            {u.banned ? "解封用户" : "封禁用户"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm(`删除用户 ${u.email}？`)) drop.mutate(u);
                            }}
                          >
                            删除
                          </DropdownMenuItem>
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end gap-1 px-4 py-3 text-xs">
            <Button
              size="sm"
              variant="ghost"
              className="size-7 p-0"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              ‹
            </Button>
            <span className="inline-flex size-7 items-center justify-center rounded border border-primary bg-white text-primary">
              {page}
            </span>
            <span className="text-muted-foreground">/ {totalPages}</span>
            <Button
              size="sm"
              variant="ghost"
              className="size-7 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              ›
            </Button>
            <select
              className="ml-2 h-7 rounded border border-input bg-background px-1.5 text-xs"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) as PageSize);
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} 条 / 页
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <DataDrawer
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.mode === "edit" ? `编辑用户 ${editing?.row?.email}` : "新建用户"}
        submitting={update.isPending}
        onSubmit={() => update.mutate(form)}
      >
        <div className="flex flex-col gap-4 pb-6">
          <Section title="账号">
            <Field label="邮箱" required>
              <Input
                value={String(form.email ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Field>
            <Field label={editing?.mode === "edit" ? "新密码 (留空保持)" : "密码"} required={editing?.mode === "create"}>
              <Input
                type="password"
                value={String(form.password ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="管理员"><Switch
                checked={Boolean(form.is_admin)}
                onCheckedChange={(c) => setForm((f) => ({ ...f, is_admin: c ? 1 : 0 }))}
              /></Field>
              <Field label="员工"><Switch
                checked={Boolean(form.is_staff)}
                onCheckedChange={(c) => setForm((f) => ({ ...f, is_staff: c ? 1 : 0 }))}
              /></Field>
            </div>
            <Field label="封禁">
              <Switch
                checked={Boolean(form.banned)}
                onCheckedChange={(c) => setForm((f) => ({ ...f, banned: c ? 1 : 0 }))}
              />
            </Field>
          </Section>

          <Section title="订阅">
            <Field label="订阅">
              <select
                className="h-9 rounded border border-input bg-background px-2 text-sm"
                value={String(form.plan_id ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
              >
                <option value="">— 无 —</option>
                {(plans.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="权限组">
              <select
                className="h-9 rounded border border-input bg-background px-2 text-sm"
                value={String(form.group_id ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}
              >
                <option value="">— 无 —</option>
                {(groups.data ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="到期时间 (留空 = 长期)">
              <Input
                type="datetime-local"
                value={String(form.expired_at ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, expired_at: e.target.value }))}
              />
            </Field>
          </Section>

          <Section title="流量与限制">
            <div className="grid grid-cols-2 gap-3">
              <Field label="总流量 (GB)">
                <Input
                  type="number"
                  step="0.01"
                  value={String(form.transfer_enable ?? "")}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, transfer_enable: Number(e.target.value) }))
                  }
                />
              </Field>
              <Field label="设备限制 (空=不限)">
                <Input
                  type="number"
                  value={String(form.device_limit ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, device_limit: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="已用上传 (GB)">
                <Input
                  type="number"
                  step="0.01"
                  value={String(form.u ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, u: Number(e.target.value) }))}
                />
              </Field>
              <Field label="已用下载 (GB)">
                <Input
                  type="number"
                  step="0.01"
                  value={String(form.d ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, d: Number(e.target.value) }))}
                />
              </Field>
            </div>
            <Field label="限速 (Mbps,空=不限)">
              <Input
                type="number"
                value={String(form.speed_limit ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, speed_limit: e.target.value }))}
              />
            </Field>
          </Section>

          <Section title="财务">
            <div className="grid grid-cols-2 gap-3">
              <Field label="钱包余额 (分)">
                <Input
                  type="number"
                  value={String(form.balance ?? "")}
                  onChange={(e) => setForm((f) => ({ ...f, balance: Number(e.target.value) }))}
                />
              </Field>
              <Field label="佣金余额 (分)">
                <Input
                  type="number"
                  value={String(form.commission_balance ?? "")}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, commission_balance: Number(e.target.value) }))
                  }
                />
              </Field>
            </div>
          </Section>

          <Section title="备注">
            <textarea
              className="min-h-[64px] rounded border border-input bg-background p-2 text-sm"
              value={String(form.remarks ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </Section>
        </div>
      </DataDrawer>
    </>
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
      <span className="text-sm">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </span>
      {children}
    </div>
  );
}

// shadcn Switch import is not at top-level because we import lazily for tree-shaking
// — but TypeScript wants it visible. Re-import inline:
import { Switch } from "@/components/ui/switch";
