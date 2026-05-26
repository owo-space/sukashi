import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatBytes } from "@/lib/format";

interface AdminServer {
  id: number;
  type: string;
  name: string;
  parent_id?: number | null;
  rate: string | number;
  tags?: string[] | null;
  group_id?: number[] | null;
  is_online?: boolean | number;
  show?: boolean | number;
  host?: string;
  port?: number;
  online?: number;
  last_check_at?: number | null;
  available_status?: number;
  last_push_at?: number | null;
  traffic?: { up: number; down: number };
}

export function AdminServerPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.server.manage.getNodes"],
    queryFn: () => apiGet<AdminServer[]>("/admin/server/manage/getNodes"),
    refetchInterval: 30_000
  });

  const toggleShow = useMutation({
    mutationFn: (s: AdminServer) =>
      apiPost("/admin/server/manage/save", { id: s.id, show: s.show ? 0 : 1, type: s.type }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.server.manage.getNodes"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-3">
        <div>
          <Button size="sm" variant="outline">
            <Plus className="size-4" />
            添加节点
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>排序</TableHead>
              <TableHead>显示</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>地址</TableHead>
              <TableHead>倍率</TableHead>
              <TableHead>在线</TableHead>
              <TableHead>上行/下行</TableHead>
              <TableHead>标签</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              data.map((s) => (
                <TableRow key={`${s.type}-${s.id}`}>
                  <TableCell className="cursor-move text-muted-foreground">≡</TableCell>
                  <TableCell>
                    <Switch checked={Boolean(s.show)} onCheckedChange={() => toggleShow.mutate(s)} />
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.type}</TableCell>
                  <TableCell>
                    <Badge variant={s.is_online ? "default" : "outline"}>
                      {s.is_online ? "在线" : "离线"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {s.host}
                    {s.port ? `:${s.port}` : ""}
                  </TableCell>
                  <TableCell>{s.rate}x</TableCell>
                  <TableCell>{s.online ?? 0}</TableCell>
                  <TableCell className="text-xs">
                    {s.traffic
                      ? `${formatBytes(s.traffic.up)} / ${formatBytes(s.traffic.down)}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {(s.tags ?? []).map((t) => (
                      <Badge key={t} variant="secondary" className="mr-1">
                        {t}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">
                      操作
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
