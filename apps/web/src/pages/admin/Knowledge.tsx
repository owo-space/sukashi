import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { formatUnixDate } from "@/lib/format";
import type { KnowledgeItem } from "@/lib/types";

export function AdminKnowledgePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.knowledge.fetch"],
    queryFn: () => apiGet<KnowledgeItem[]>("/admin/knowledge/fetch")
  });

  const showToggle = useMutation({
    mutationFn: (k: KnowledgeItem) =>
      apiPost("/admin/knowledge/show", { id: k.id, show: k.show ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.knowledge.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/knowledge/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.knowledge.fetch"] })
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div>
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            添加文章
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>排序</TableHead>
              <TableHead>显示</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>标题</TableHead>
              <TableHead>语言</TableHead>
              <TableHead>更新时间</TableHead>
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
              data.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="cursor-move text-muted-foreground">≡</TableCell>
                  <TableCell>
                    <Switch checked={Boolean(k.show)} onCheckedChange={() => showToggle.mutate(k)} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{k.category}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{k.title}</TableCell>
                  <TableCell>{k.language ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatUnixDate(k.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => drop.mutate(k.id)}
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
