import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeftRight, BadgeDollarSign, UserPlus2 } from "lucide-react";
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

function SectionCard({
  title,
  action,
  children,
  noPad
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPad?: boolean;
}) {
  return (
    <Card className="rounded border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-3">
        <CardTitle className="text-sm font-medium text-slate-700">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className={noPad ? "p-0" : "py-4"}>{children}</CardContent>
    </Card>
  );
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
    mutationFn: (amount: number) => apiPost("/user/transfer", { transfer_amount: amount }),
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
      <SectionCard title="我的邀请">
        <div className="relative">
          <UserPlus2 className="absolute right-0 top-0 size-8 text-slate-300" />
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-medium text-slate-800">{formatCny(balance)}</span>
            <span className="text-sm text-slate-400">CNY</span>
          </div>
          <div className="mt-1 text-sm text-slate-500">当前剩余佣金</div>
          <div className="mt-4 flex gap-2">
            <Button variant="default" size="sm" onClick={() => transfer.mutate(balance)} disabled={!balance}>
              <ArrowLeftRight className="size-4" />
              划 转
            </Button>
            <Button variant="outline" size="sm" onClick={() => withdraw.mutate()} disabled={!balance}>
              <BadgeDollarSign className="size-4" />
              推广佣金提现
            </Button>
          </div>
        </div>
      </SectionCard>

      <Card className="rounded border-slate-200">
        <CardContent className="py-4">
          <div className="flex flex-col gap-2.5 text-sm">
            <Row label="已注册用户数" value={`${stat?.invite_user_count ?? 0}人`} />
            <Row label="佣金比例" value={`${stat?.commission_rate ?? 0}%`} />
            <Row label="确认中的佣金" value={`¥ ${formatCny(stat?.commission_balance_pending ?? 0)}`} />
            <Row label="累计获得佣金" value={`¥ ${formatCny(stat?.commission_balance_total ?? 0)}`} last />
          </div>
        </CardContent>
      </Card>

      <SectionCard
        title="邀请码管理"
        action={
          <Button size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
            生成邀请码
          </Button>
        }
        noPad
      >
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="text-slate-500">邀请码</TableHead>
              <TableHead className="text-right text-slate-500">创建时间</TableHead>
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
                <TableRow key={c.id} className="border-b border-slate-100">
                  <TableCell className="font-mono">
                    {c.code}
                    <button
                      onClick={() => copyInviteUrl(c.code)}
                      className="ml-3 text-xs text-primary hover:underline"
                    >
                      复制链接
                    </button>
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-500 font-mono">
                    {c.created_at ? formatUnixDate(c.created_at) : "Invalid date"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard title="佣金发放记录" noPad>
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="text-slate-500">发放时间</TableHead>
              <TableHead className="text-right text-slate-500">佣金</TableHead>
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
                <TableRow key={log.id} className="border-b border-slate-100">
                  <TableCell>{formatUnixDate(log.created_at)}</TableCell>
                  <TableCell className="text-right">¥ {formatCny(log.get_amount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between ${last ? "" : "border-b border-slate-100 pb-2.5"}`}>
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
