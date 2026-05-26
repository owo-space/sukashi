import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatUnixDate } from "@/lib/format";

interface ServerGroup {
  id: number;
  name: string;
  user_count?: number;
  server_count?: number;
  created_at: number;
}

export function AdminServerGroupPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.server.group.fetch"],
    queryFn: () => apiGet<ServerGroup[]>("/admin/server/group/fetch")
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/group/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.server.group.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div>
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            添加权限组
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>用户数</TableHead>
              <TableHead>节点数</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              data.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>{g.id}</TableCell>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{g.user_count ?? 0}</TableCell>
                  <TableCell>{g.server_count ?? 0}</TableCell>
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
