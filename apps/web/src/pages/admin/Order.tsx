import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { EmptyState } from "@/components/EmptyState";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatCny, formatUnixDate } from "@/lib/format";

interface AdminOrder {
  id: number;
  trade_no: string;
  user?: { id: number; email: string };
  plan?: { id: number; name: string };
  total_amount: number;
  period: string;
  status: number;
  commission_status: number;
  created_at: number;
}

const PAGE_SIZE = 20;

const STATUS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "0": { label: "待支付", variant: "secondary" },
  "1": { label: "处理中", variant: "default" },
  "2": { label: "已取消", variant: "outline" },
  "3": { label: "已完成", variant: "default" },
  "4": { label: "已折扣", variant: "outline" }
};

export function AdminOrderPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [tradeNo, setTradeNo] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin.order.fetch", page, filter, tradeNo],
    queryFn: () =>
      apiGet<{ data: AdminOrder[]; total: number }>("/admin/order/fetch", {
        params: { page, page_size: PAGE_SIZE, status: filter || undefined, trade_no: tradeNo || undefined }
      })
  });

  const paid = useMutation({
    mutationFn: (tn: string) => apiPost("/admin/order/paid", { trade_no: tn }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.order.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });
  const cancel = useMutation({
    mutationFn: (tn: string) => apiPost("/admin/order/cancel", { trade_no: tn }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.order.fetch"] })
  });

  const rows = data?.data ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={tradeNo}
            onChange={(e) => setTradeNo(e.target.value)}
            placeholder="订单号"
            className="w-56"
          />
          <Select value={filter} onValueChange={(v) => setFilter(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">全部</SelectItem>
              <SelectItem value="0">待支付</SelectItem>
              <SelectItem value="1">处理中</SelectItem>
              <SelectItem value="2">已取消</SelectItem>
              <SelectItem value="3">已完成</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setPage(1)}>查询</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>订单号</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>订阅</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>周期</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((o) => {
                const st = STATUS[String(o.status)] ?? { label: String(o.status), variant: "outline" as const };
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.trade_no}</TableCell>
                    <TableCell>{o.user?.email ?? `#${o.id}`}</TableCell>
                    <TableCell>{o.plan?.name ?? "—"}</TableCell>
                    <TableCell>¥ {formatCny(o.total_amount)}</TableCell>
                    <TableCell>{o.period}</TableCell>
                    <TableCell>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatUnixDate(o.created_at)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {o.status === 0 ? (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => paid.mutate(o.trade_no)}>
                            标记已支付
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => cancel.mutate(o.trade_no)}
                          >
                            取消
                          </Button>
                        </>
                      ) : null}
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
