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

interface ServerRoute {
  id: number;
  remarks: string;
  match: string[];
  action: string;
  action_value?: string;
}

export function AdminServerRoutePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.server.route.fetch"],
    queryFn: () => apiGet<ServerRoute[]>("/admin/server/route/fetch")
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/route/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.server.route.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div>
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            添加路由
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>匹配</TableHead>
              <TableHead>动作</TableHead>
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
              data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>{r.remarks}</TableCell>
                  <TableCell className="text-xs">
                    {(r.match ?? []).slice(0, 4).map((m) => (
                      <Badge key={m} variant="secondary" className="mr-1">
                        {m}
                      </Badge>
                    ))}
                    {r.match && r.match.length > 4 ? <span className="text-muted-foreground">…</span> : null}
                  </TableCell>
                  <TableCell>
                    {r.action}
                    {r.action_value ? ` → ${r.action_value}` : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => drop.mutate(r.id)}
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
