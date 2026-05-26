import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatCny, formatUnixDate } from "@/lib/format";

interface Coupon {
  id: number;
  code: string;
  name: string;
  type: number;
  value: number;
  show: boolean | number;
  limit_use: number | null;
  limit_use_with_user: number | null;
  started_at: number;
  ended_at: number;
}

export function AdminCouponPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.coupon.fetch"],
    queryFn: () => apiGet<Coupon[]>("/admin/coupon/fetch")
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/coupon/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.coupon.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div>
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            添加优惠券
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>代码</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>显示</TableHead>
              <TableHead>有效期</TableHead>
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
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.id}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs">{c.code}</TableCell>
                  <TableCell>{c.type === 1 ? "百分比" : "固定金额"}</TableCell>
                  <TableCell>{c.type === 1 ? `${c.value}%` : `¥ ${formatCny(c.value)}`}</TableCell>
                  <TableCell>
                    <Badge variant={c.show ? "default" : "outline"}>{c.show ? "显示" : "隐藏"}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatUnixDate(c.started_at)} ~ {formatUnixDate(c.ended_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => drop.mutate(c.id)}
                    >
                      <Trash2 className="size-4" />
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
