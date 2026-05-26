import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftRight, BadgeDollarSign, Copy, UserPlus2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatCny, formatUnixDate } from "@/lib/format";
import type { InviteCode, InviteStat } from "@/lib/types";

interface CommissionLog {
  id: number;
  trade_no: string;
  invite_user_id: number;
  pending_amount: number;
  get_amount: number;
  created_at: number;
}

export function UserInvitePage() {
  const qc = useQueryClient();
  const { data: stat, isLoading } = useQuery({
    queryKey: ["user.invite.save"],
    queryFn: () => apiGet<InviteStat>("/user/invite/save")
  });
  const { data: codes } = useQuery({
    queryKey: ["user.invite.fetch"],
    queryFn: () => apiGet<{ codes: InviteCode[] }>("/user/invite/fetch"),
    select: (r) => r?.codes ?? []
  });
  const { data: logs } = useQuery({
    queryKey: ["user.invite.details"],
    queryFn: () => apiGet<CommissionLog[]>("/user/invite/details").catch(() => [])
  });

  const gen = useMutation({
    mutationFn: () => apiGet<boolean>("/user/invite/save"),
    onSuccess: () => {
      toast.success("邀请码已生成");
      qc.invalidateQueries({ queryKey: ["user.invite.fetch"] });
    }
  });
  const transfer = useMutation({
    mutationFn: (transfer_amount: number) =>
      apiPost("/user/transfer", { transfer_amount }),
    onSuccess: () => {
      toast.success("已划转到钱包");
      qc.invalidateQueries({ queryKey: ["user.invite.save"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : (err as Error).message)
  });
  const withdraw = useMutation({
    mutationFn: () => apiPost("/user/comm/withdraw", {}),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : (err as Error).message)
  });

  const copyInviteUrl = (code: string) => {
    const url = `${window.location.origin}/register?code=${encodeURIComponent(code)}`;
    void navigator.clipboard.writeText(url);
    toast.success("已复制邀请链接");
  };

  if (isLoading) return <Skeleton className="h-96 w-full" />;
  const balance = stat?.commission_balance ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">我的邀请</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <UserPlus2 className="absolute right-6 top-2 size-8 text-muted-foreground/40" />
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-medium">{formatCny(balance)}</span>
            <span className="text-sm text-muted-foreground">CNY</span>
          </div>
          <div className="mt-1 text-sm text-muted-foreground">当前剩余佣金</div>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => transfer.mutate(balance)} disabled={!balance}>
              <ArrowLeftRight className="size-4" />
              划转
            </Button>
            <Button variant="outline" size="sm" onClick={() => withdraw.mutate()} disabled={!balance}>
              <BadgeDollarSign className="size-4" />
              推广佣金提现
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 gap-2 py-4 text-sm md:grid-cols-2">
          <Row label="已注册用户数" value={`${stat?.invite_user_count ?? 0}人`} />
          <Row label="佣金比例" value={`${stat?.commission_rate ?? 0}%`} />
          <Row label="确认中的佣金" value={`¥ ${formatCny(stat?.commission_balance_pending ?? 0)}`} />
          <Row label="累计获得佣金" value={`¥ ${formatCny(stat?.commission_balance_total ?? 0)}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">邀请码管理</CardTitle>
          <Button size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
            生成邀请码
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>邀请码</TableHead>
                <TableHead className="text-right">创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!codes || codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="font-mono">{c.code}</span>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => copyInviteUrl(c.code)}
                        className="ml-2 h-auto p-0 text-primary"
                      >
                        <Copy className="size-3" /> 复制链接
                      </Button>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatUnixDate(c.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">佣金发放记录</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>发放时间</TableHead>
                <TableHead className="text-right">佣金</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!logs || logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatUnixDate(log.created_at)}</TableCell>
                    <TableCell className="text-right">¥ {formatCny(log.get_amount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
