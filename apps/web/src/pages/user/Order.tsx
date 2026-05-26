import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
import { apiGet } from "@/lib/api";
import { formatCny, formatUnixDate } from "@/lib/format";
import type { Order } from "@/lib/types";

const STATUS_LABEL: Record<number, { label: string; cls: string }> = {
  0: { label: "待支付", cls: "border-slate-300 bg-slate-50 text-slate-600" },
  1: { label: "已支付", cls: "border-emerald-200 bg-emerald-50 text-emerald-600" },
  2: { label: "已取消", cls: "border-slate-300 bg-slate-50 text-slate-500" },
  3: { label: "已完成", cls: "border-emerald-200 bg-emerald-50 text-emerald-600" },
  4: { label: "已折扣", cls: "border-indigo-200 bg-indigo-50 text-indigo-600" }
};

const PERIOD_LABEL: Record<string, string> = {
  month_price: "月付",
  quarter_price: "季付",
  half_year_price: "半年付",
  year_price: "年付",
  two_year_price: "两年付",
  three_year_price: "三年付",
  onetime_price: "一次性",
  reset_price: "重置流量"
};

export function UserOrderPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user.order.fetch"],
    queryFn: () => apiGet<Order[]>("/user/order/fetch")
  });

  return (
    <Card className="rounded border-slate-200">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="w-12 text-slate-500">#</TableHead>
              <TableHead className="text-slate-500">订单号</TableHead>
              <TableHead className="text-slate-500">周期</TableHead>
              <TableHead className="text-slate-500">订单金额</TableHead>
              <TableHead className="text-slate-500">订单状态</TableHead>
              <TableHead className="text-slate-500">创建时间</TableHead>
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
              data.map((o, i) => {
                const s = STATUS_LABEL[o.status] ?? { label: String(o.status), cls: "" };
                return (
                  <TableRow key={o.id} className="border-b border-slate-100">
                    <TableCell className="text-slate-600">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{o.trade_no}</TableCell>
                    <TableCell className="text-slate-600">{PERIOD_LABEL[o.period] ?? o.period}</TableCell>
                    <TableCell className="text-slate-600">¥ {formatCny(o.total_amount)}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-xs ${s.cls}`}
                      >
                        {s.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{formatUnixDate(o.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/order/${o.trade_no}`}
                        className="text-primary hover:underline text-sm"
                      >
                        查看
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
