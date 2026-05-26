import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { FormDialog, type FieldDef } from "@/components/admin/FormDialog";
import { ApiError, apiGet, apiPost } from "@/lib/api";

interface ServerRoute {
  id: number;
  remarks: string;
  match: string[] | string;
  action: string;
  action_value?: string | null;
}

const FIELDS: FieldDef[] = [
  { key: "remarks", label: "备注", required: true, span: 2 },
  {
    key: "match",
    label: "匹配规则 (一行一条)",
    type: "textarea",
    required: true,
    span: 2,
    placeholder: "geosite:google\ngeosite:netflix\n*.example.com",
    hint: "支持 geosite:xxx / geoip:xxx / 通配符"
  },
  {
    key: "action",
    label: "动作",
    type: "select",
    required: true,
    options: [
      { value: "block", label: "block (拒绝)" },
      { value: "dns", label: "dns (DNS)" },
      { value: "direct", label: "direct (直连)" }
    ]
  },
  { key: "action_value", label: "动作值 (可选)", placeholder: "remark" }
];

export function AdminServerRoutePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.server.route.fetch"],
    queryFn: () => apiGet<ServerRoute[]>("/admin/server/route/fetch")
  });

  const [editing, setEditing] = useState<Partial<ServerRoute> | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) => {
      const payload: Record<string, unknown> = { ...input };
      if (typeof payload.match === "string") {
        payload.match = (payload.match as string)
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
      return apiPost("/admin/server/route/save", payload);
    },
    onSuccess: () => {
      toast.success("已保存");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.server.route.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/server/route/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.server.route.fetch"] })
  });

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-3 py-3">
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing({});
                setValues({ action: "block" });
              }}
            >
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
                data.map((r) => {
                  const matches = Array.isArray(r.match) ? r.match : [];
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.id}</TableCell>
                      <TableCell>{r.remarks}</TableCell>
                      <TableCell className="text-xs">
                        {matches.slice(0, 4).map((m) => (
                          <Badge key={m} variant="secondary" className="mr-1">
                            {m}
                          </Badge>
                        ))}
                        {matches.length > 4 ? (
                          <span className="text-muted-foreground">+{matches.length - 4}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {r.action}
                        {r.action_value ? ` → ${r.action_value}` : ""}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(r);
                            setValues({
                              id: r.id,
                              remarks: r.remarks,
                              match: matches.join("\n"),
                              action: r.action,
                              action_value: r.action_value ?? ""
                            });
                          }}
                        >
                          <Pencil className="size-4" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`删除路由 "${r.remarks}"？`)) drop.mutate(r.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                          删除
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

      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing && "id" in editing ? "编辑路由" : "添加路由"}
        fields={FIELDS}
        values={values}
        onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))}
        onSubmit={() => save.mutate(values)}
        submitting={save.isPending}
        size="lg"
      />
    </>
  );
}
