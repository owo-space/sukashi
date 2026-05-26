import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { formatBytes, formatCny, formatUnixDate } from "@/lib/format";

interface AdminUser {
  id: number;
  email: string;
  banned: number;
  plan_id: number | null;
  plan?: { id: number; name: string } | null;
  group_id?: number | null;
  group?: { id: number; name: string } | null;
  transfer_enable?: number;
  u?: number;
  d?: number;
  expired_at?: number | null;
  device?: number;
  balance: number;
  commission_balance: number;
  created_at: number;
}

const PAGE_SIZE = 20;

export function AdminUserPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin.user.fetch", page, search],
    queryFn: () =>
      apiGet<{ data: AdminUser[]; total: number }>("/admin/user/fetch", {
        params: { page, page_size: PAGE_SIZE, email: search || undefined }
      })
  });

  const ban = useMutation({
    mutationFn: (u: AdminUser) =>
      apiPost("/admin/user/ban", { id: u.id, banned: u.banned ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.user.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const rows = data?.data ?? [];
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE)),
    [data?.total]
  );

  return (
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
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>订阅</TableHead>
              <TableHead>权限组</TableHead>
              <TableHead>已用</TableHead>
              <TableHead>流量</TableHead>
              <TableHead>余额</TableHead>
              <TableHead>佣金</TableHead>
              <TableHead>到期时间</TableHead>
              <TableHead>操作</TableHead>
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
                const total = u.transfer_enable ?? 0;
                return (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.banned ? "destructive" : "default"}>
                        {u.banned ? "封禁" : "正常"}
                      </Badge>
                    </TableCell>
                    <TableCell>{u.plan?.name ?? "—"}</TableCell>
                    <TableCell>{u.group?.name ?? "—"}</TableCell>
                    <TableCell>{formatBytes(used)}</TableCell>
                    <TableCell>{formatBytes(total)}</TableCell>
                    <TableCell>¥ {formatCny(u.balance)}</TableCell>
                    <TableCell>¥ {formatCny(u.commission_balance)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.expired_at === 0 || u.expired_at == null
                        ? "长期"
                        : formatUnixDate(u.expired_at)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => ban.mutate(u)}>
                        {u.banned ? "解封" : "封禁"}
                      </Button>
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
  );
}
