import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { DataDrawer } from "@/components/admin/DataDrawer";
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
  const [editing, setEditing] = useState<{ mode: "create" | "edit"; row?: ServerGroup } | null>(
    null
  );
  const [name, setName] = useState("");

  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost("/admin/server/group/save", input),
    onSuccess: () => {
      toast.success("已保存");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.server.group.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/group/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.server.group.fetch"] })
  });

  return (
    <>
      <Card className="rounded">
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b border-slate-100">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1"
              onClick={() => {
                setEditing({ mode: "create" });
                setName("");
              }}
            >
              <Plus className="size-4" />
              添加权限组
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="text-slate-500">ID</TableHead>
                <TableHead className="text-slate-500">名称</TableHead>
                <TableHead className="text-slate-500">用户数</TableHead>
                <TableHead className="text-slate-500">节点数</TableHead>
                <TableHead className="text-slate-500">创建时间</TableHead>
                <TableHead className="text-right text-slate-500">操作</TableHead>
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
                  <TableRow key={g.id} className="border-b border-slate-100">
                    <TableCell className="text-slate-600">{g.id}</TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-slate-600">{g.user_count ?? 0}</TableCell>
                    <TableCell className="text-slate-600">{g.server_count ?? 0}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatUnixDate(g.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing({ mode: "edit", row: g });
                            setName(g.name);
                          }}
                        >
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`删除权限组 "${g.name}"？`)) drop.mutate(g.id);
                          }}
                        >
                          删除
                        </DropdownMenuItem>
                      </RowActions>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataDrawer
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.mode === "edit" ? "编辑权限组" : "新建权限组"}
        submitting={save.isPending}
        onSubmit={() =>
          save.mutate(editing?.row?.id ? { id: editing.row.id, name } : { name })
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm">权限组名称 <span className="text-rose-500">*</span></span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
      </DataDrawer>
    </>
  );
}
