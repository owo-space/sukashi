import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { formatUnixDate } from "@/lib/format";
import type { NoticeItem } from "@/lib/types";

export function AdminNoticePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.notice.fetch"],
    queryFn: () => apiGet<NoticeItem[]>("/admin/notice/fetch")
  });

  const showToggle = useMutation({
    mutationFn: (n: NoticeItem) => apiPost("/admin/notice/show", { id: n.id, show: n.show ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.notice.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/notice/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.notice.fetch"] })
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div>
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            添加公告
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>显示</TableHead>
              <TableHead>标题</TableHead>
              <TableHead>更新时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              data.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>{n.id}</TableCell>
                  <TableCell>
                    <Switch checked={Boolean(n.show)} onCheckedChange={() => showToggle.mutate(n)} />
                  </TableCell>
                  <TableCell className="font-medium">{n.title}</TableCell>
                  <TableCell className="text-muted-foreground">{formatUnixDate(n.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => drop.mutate(n.id)}
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
