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

interface Giftcard {
  id: number;
  template_id: number;
  template?: { name: string };
  code: string;
  status: number; // 0 = unused, 1 = used
  amount: number;
  used_at: number | null;
  used_by_user_id: number | null;
  created_at: number;
}

export function AdminGiftcardPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.giftcard.fetch"],
    queryFn: () => apiGet<Giftcard[]>("/admin/giftcard/fetch")
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/giftcard/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.giftcard.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div>
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            生成礼品卡
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>模板</TableHead>
              <TableHead>代码</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>使用时间</TableHead>
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
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              data.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{g.id}</TableCell>
                  <TableCell>{g.template?.name ?? `#${g.template_id}`}</TableCell>
                  <TableCell className="font-mono text-xs">{g.code}</TableCell>
                  <TableCell>¥ {formatCny(g.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={g.status === 0 ? "secondary" : "outline"}>
                      {g.status === 0 ? "未使用" : "已使用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{g.used_at ? formatUnixDate(g.used_at) : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatUnixDate(g.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => drop.mutate(g.id)}
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
