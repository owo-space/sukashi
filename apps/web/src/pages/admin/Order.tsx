import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { ApiError, apiGetEnvelope, apiPost } from "@/lib/api";
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

const STATUS_TAG: Record<number, { label: string; cls: string }> = {
  0: { label: "待支付", cls: "border-slate-300 bg-slate-50 text-slate-600" },
  1: { label: "已支付", cls: "border-emerald-200 bg-emerald-50 text-emerald-600" },
  2: { label: "已取消", cls: "border-slate-300 bg-slate-50 text-slate-500" },
  3: { label: "已完成", cls: "border-emerald-200 bg-emerald-50 text-emerald-600" },
  4: { label: "已折扣", cls: "border-indigo-200 bg-indigo-50 text-indigo-600" }
};

const PAGE = 10;

export function AdminOrderPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin.order.fetch", page, search, status],
    queryFn: () =>
      apiGetEnvelope<AdminOrder[]>("/admin/order/fetch", {
        params: {
          page,
          page_size: PAGE,
          trade_no: search || undefined,
          status: status === "all" ? undefined : status
        }
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
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <Card className="rounded">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="订单号"
            className="h-9 max-w-xs"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="0">待支付</SelectItem>
              <SelectItem value="1">已支付</SelectItem>
              <SelectItem value="2">已取消</SelectItem>
              <SelectItem value="3">已完成</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-9" onClick={() => setPage(1)}>
            查询
          </Button>
          <span className="ml-auto text-xs text-slate-500">共 {total} 笔订单</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="text-slate-500">订单号</TableHead>
              <TableHead className="text-slate-500">用户</TableHead>
              <TableHead className="text-slate-500">订阅</TableHead>
              <TableHead className="text-slate-500">金额</TableHead>
              <TableHead className="text-slate-500">周期</TableHead>
              <TableHead className="text-slate-500">状态</TableHead>
              <TableHead className="text-slate-500">创建时间</TableHead>
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
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((o) => {
                const st = STATUS_TAG[o.status] ?? { label: String(o.status), cls: "" };
                return (
                  <TableRow key={o.id} className="border-b border-slate-100">
                    <TableCell className="font-mono text-xs">{o.trade_no}</TableCell>
                    <TableCell className="text-slate-600">
                      {o.user?.email ?? `#${o.id}`}
                    </TableCell>
                    <TableCell className="text-slate-600">{o.plan?.name ?? "-"}</TableCell>
                    <TableCell className="text-slate-600">¥ {formatCny(o.total_amount)}</TableCell>
                    <TableCell className="text-slate-600">{o.period}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatUnixDate(o.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        {o.status === 0 ? (
                          <>
                            <DropdownMenuItem onClick={() => paid.mutate(o.trade_no)}>
                              标记已支付
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => cancel.mutate(o.trade_no)}
                            >
                              取消订单
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem disabled>无可用操作</DropdownMenuItem>
                        )}
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
          <Button
            size="sm"
            variant="ghost"
            className="size-7 p-0"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            ›
          </Button>
          <span className="ml-2 inline-flex items-center text-slate-500">10 条 / 页</span>
        </div>
      </CardContent>
    </Card>
  );
}
