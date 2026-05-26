import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

const STATUS: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> =
  {
    0: { label: "待支付", variant: "secondary" },
    1: { label: "处理中", variant: "default" },
    2: { label: "已取消", variant: "outline" },
    3: { label: "已完成", variant: "default" },
    4: { label: "已折扣", variant: "outline" }
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
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>订单号</TableHead>
              <TableHead>周期</TableHead>
              <TableHead>订单金额</TableHead>
              <TableHead>订单状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
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
                const s = STATUS[o.status] ?? { label: String(o.status), variant: "outline" as const };
                return (
                  <TableRow key={o.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{o.trade_no}</TableCell>
                    <TableCell>{PERIOD_LABEL[o.period] ?? o.period}</TableCell>
                    <TableCell>¥ {formatCny(o.total_amount)}</TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatUnixDate(o.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`/order/${o.trade_no}`}>查看</Link>
                      </Button>
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
