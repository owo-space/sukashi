import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { FormDialog, type FieldDef } from "@/components/admin/FormDialog";
import { ApiError, apiGet, apiGetEnvelope, apiPost } from "@/lib/api";
import { formatCny, formatUnixDate } from "@/lib/format";
import type { Plan } from "@/lib/types";

interface AdminUser {
  id: number;
  email: string;
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

const PAGE_SIZE = 20;

function isoToUnix(s: string): number | null {
  if (!s) return null;
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 1000);
}
function unixToIso(u: number | null | undefined): string {
  if (!u) return "";
  return new Date(u * 1000).toISOString().slice(0, 16);
}

export function AdminUserPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin.user.fetch", page, search],
    queryFn: () =>
      apiGetEnvelope<AdminUser[]>("/admin/user/fetch", {
        params: { page, page_size: PAGE_SIZE, email: search || undefined }
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

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const update = useMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const payload: Record<string, unknown> = { ...input };
      if (typeof payload.expired_at === "string") {
        payload.expired_at = payload.expired_at ? isoToUnix(payload.expired_at as string) : null;
      }
      if (payload.password === "") delete payload.password;
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
    mutationFn: (u: AdminUser) =>
      apiPost("/admin/user/ban", { id: u.id, banned: u.banned ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.user.fetch"] })
  });
  const drop = useMutation({
    mutationFn: (u: AdminUser) => apiPost("/admin/user/delUser", { id: u.id }),
    onSuccess: () => {
      toast.success("已删除");
      qc.invalidateQueries({ queryKey: ["admin.user.fetch"] });
    }
  });
  const resetSecret = useMutation({
    mutationFn: (u: AdminUser) => apiPost("/admin/user/resetSecret", { id: u.id }),
    onSuccess: () => toast.success("订阅信息已重置")
  });
  const sendMail = useMutation({
    mutationFn: (input: { id?: number; subject: string; content: string }) =>
      apiPost("/admin/user/sendMail", input),
    onSuccess: () => toast.success("邮件已发送")
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const fields: FieldDef[] = [
    { key: "email", label: "邮箱", required: true },
    { key: "password", label: "新密码 (留空不改)", type: "password" },
    {
      key: "plan_id",
      label: "订阅",
      type: "select",
      options: [
        { value: "", label: "— 无订阅 —" },
        ...(plans.data ?? []).map((p) => ({ value: String(p.id), label: p.name }))
      ]
    },
    {
      key: "group_id",
      label: "权限组",
      type: "select",
      options: [
        { value: "", label: "— 无 —" },
        ...(groups.data ?? []).map((g) => ({ value: String(g.id), label: g.name }))
      ]
    },
    { key: "transfer_enable", label: "总流量 (Bytes)", type: "number" },
    { key: "u", label: "已用上传 (Bytes)", type: "number" },
    { key: "d", label: "已用下载 (Bytes)", type: "number" },
    { key: "device_limit", label: "设备限制 (空=不限)", type: "number" },
    { key: "speed_limit", label: "限速 (Mbps,空=不限)", type: "number" },
    { key: "expired_at", label: "到期时间 (留空=长期)", placeholder: "YYYY-MM-DD HH:mm" },
    { key: "balance", label: "钱包余额 (CNY 单位:分)", type: "number" },
    { key: "commission_balance", label: "佣金 (CNY 单位:分)", type: "number" },
    { key: "discount", label: "折扣 %", type: "number" },
    { key: "commission_type", label: "佣金类型 (0/1/2)", type: "number" },
    { key: "commission_rate", label: "佣金比例 %", type: "number" },
    { key: "is_admin", label: "管理员", type: "switch" },
    { key: "is_staff", label: "Staff", type: "switch" },
    { key: "banned", label: "已封禁", type: "switch" },
    { key: "remarks", label: "备注", type: "textarea", span: 2 }
  ];

  function openEdit(u: AdminUser) {
    setEditing(u);
    setValues({
      id: u.id,
      email: u.email,
      password: "",
      plan_id: u.plan_id ? String(u.plan_id) : "",
      group_id: u.group_id ? String(u.group_id) : "",
      transfer_enable: u.transfer_enable ?? 0,
      u: u.u ?? 0,
      d: u.d ?? 0,
      device_limit: u.device_limit ?? "",
      speed_limit: u.speed_limit ?? "",
      expired_at: u.expired_at ? unixToIso(u.expired_at) : "",
      balance: u.balance ?? 0,
      commission_balance: u.commission_balance ?? 0,
      is_admin: u.is_admin ? 1 : 0,
      is_staff: u.is_staff ? 1 : 0,
      banned: u.banned ? 1 : 0,
      remarks: u.remarks ?? ""
    });
  }

  // — quick send-mail dialog —
  const [mailFor, setMailFor] = useState<AdminUser | null>(null);
  const [mailValues, setMailValues] = useState<Record<string, unknown>>({});
  const mailFields: FieldDef[] = [
    { key: "subject", label: "主题", required: true, span: 2 },
    { key: "content", label: "正文", type: "textarea", required: true, span: 2 }
  ];

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-3 py-3">
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索邮箱"
              className="w-64"
            />
            <Button onClick={() => setPage(1)}>搜索</Button>
            <span className="ml-auto text-sm text-muted-foreground">共 {total} 个用户</span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">ID</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>订阅</TableHead>
                <TableHead>权限组</TableHead>
                <TableHead>已用(G)</TableHead>
                <TableHead>流量(G)</TableHead>
                <TableHead>余额</TableHead>
                <TableHead>佣金</TableHead>
                <TableHead>到期时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
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
                  const used = (u.u ?? 0) + (u.d ?? 0);
                  const totalBytes = u.transfer_enable ?? 0;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>
                        {u.email}
                        {u.is_admin ? (
                          <Badge variant="secondary" className="ml-2">
                            管理员
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.banned ? "destructive" : "default"}>
                          {u.banned ? "封禁" : "正常"}
                        </Badge>
                      </TableCell>
                      <TableCell>{u.plan_name ?? "—"}</TableCell>
                      <TableCell>{u.group_name ?? "—"}</TableCell>
                      <TableCell>{(used / 1024 ** 3).toFixed(2)}</TableCell>
                      <TableCell>{(totalBytes / 1024 ** 3).toFixed(2)}</TableCell>
                      <TableCell>¥ {formatCny(u.balance)}</TableCell>
                      <TableCell>¥ {formatCny(u.commission_balance)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.expired_at == null ? "长期" : formatUnixDate(u.expired_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreHorizontal className="size-4" />
                              操作
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => openEdit(u)}>编辑</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setMailFor(u);
                                setMailValues({ subject: "", content: "" });
                              }}
                            >
                              发送邮件
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`重置 "${u.email}" 的订阅信息？`)) resetSecret.mutate(u);
                              }}
                            >
                              重置订阅信息
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => ban.mutate(u)}>
                              {u.banned ? "解封" : "封禁"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm(`删除用户 "${u.email}"？此操作不可逆。`)) drop.mutate(u);
                              }}
                            >
                              删除用户
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex justify-end gap-2 pt-2 text-sm">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              上一页
            </Button>
            <span className="px-2 self-center text-muted-foreground">
              第 {page} / {totalPages} 页
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              下一页
            </Button>
          </div>
        </CardContent>
      </Card>

      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing ? `编辑用户 ${editing.email}` : ""}
        fields={fields}
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        onSubmit={() => update.mutate(values)}
        submitting={update.isPending}
        size="lg"
      />

      <FormDialog
        open={mailFor !== null}
        onOpenChange={(o) => !o && setMailFor(null)}
        title={mailFor ? `发送邮件给 ${mailFor.email}` : ""}
        fields={mailFields}
        values={mailValues}
        onChange={(k, v) => setMailValues((s) => ({ ...s, [k]: v }))}
        onSubmit={() => {
          if (!mailFor) return;
          sendMail.mutate({
            id: mailFor.id,
            subject: String(mailValues.subject ?? ""),
            content: String(mailValues.content ?? "")
          });
          setMailFor(null);
        }}
        submitting={sendMail.isPending}
        submitLabel="发送"
      />
    </>
  );
}
