import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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

interface ServerRoute {
  id: number;
  remarks: string;
  match: string[] | string;
  action: string;
  action_value?: string | null;
}

export function AdminServerRoutePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.server.route.fetch"],
    queryFn: () => apiGet<ServerRoute[]>("/admin/server/route/fetch")
  });

  const [editing, setEditing] = useState<{ mode: "create" | "edit"; row?: ServerRoute } | null>(
    null
  );
  const [form, setForm] = useState<{
    id?: number;
    remarks: string;
    match: string;
    action: string;
    action_value: string;
  }>({ remarks: "", match: "", action: "block", action_value: "" });

  const save = useMutation({
    mutationFn: (input: typeof form) => {
      const payload: Record<string, unknown> = {
        remarks: input.remarks,
        match: input.match
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean),
        action: input.action,
        action_value: input.action_value || null
      };
      if (input.id) payload.id = input.id;
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
      <Card className="rounded">
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b border-slate-100">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1"
              onClick={() => {
                setEditing({ mode: "create" });
                setForm({ remarks: "", match: "", action: "block", action_value: "" });
              }}
            >
              <Plus className="size-4" />
              添加路由
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="text-slate-500">ID</TableHead>
                <TableHead className="text-slate-500">备注</TableHead>
                <TableHead className="text-slate-500">动作</TableHead>
                <TableHead className="text-slate-500">匹配条目</TableHead>
                <TableHead className="text-right text-slate-500">操作</TableHead>
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
                    <TableRow key={r.id} className="border-b border-slate-100">
                      <TableCell className="text-slate-600">{r.id}</TableCell>
                      <TableCell>{r.remarks}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded border border-slate-200 px-2 py-0.5 text-xs">
                          {r.action}
                          {r.action_value ? ` → ${r.action_value}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {matches.length} 条
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditing({ mode: "edit", row: r });
                              setForm({
                                id: r.id,
                                remarks: r.remarks,
                                match: matches.join("\n"),
                                action: r.action,
                                action_value: r.action_value ?? ""
                              });
                            }}
                          >
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm(`删除路由 "${r.remarks}"？`)) drop.mutate(r.id);
                            }}
                          >
                            删除
                          </DropdownMenuItem>
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DataDrawer
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.mode === "edit" ? "编辑路由" : "新建路由"}
        submitting={save.isPending}
        onSubmit={() => save.mutate(form)}
      >
        <div className="flex flex-col gap-3">
          <Field label="备注" required>
            <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
          </Field>
          <Field label="动作" required>
            <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="block">block (拒绝)</SelectItem>
                <SelectItem value="dns">dns (DNS 解析)</SelectItem>
                <SelectItem value="direct">direct (直连)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="动作值 (可选)">
            <Input
              value={form.action_value}
              onChange={(e) => setForm({ ...form, action_value: e.target.value })}
              placeholder="可选,例如 8.8.8.8"
            />
          </Field>
          <Field label="匹配规则 (一行一条)" required>
            <Textarea
              rows={8}
              value={form.match}
              onChange={(e) => setForm({ ...form, match: e.target.value })}
              placeholder={"geosite:google\ngeosite:netflix\n*.example.com"}
            />
          </Field>
        </div>
      </DataDrawer>
    </>
  );
}

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm">
        {label}
        {required ? <span className="text-rose-500 ml-0.5">*</span> : null}
      </span>
      {children}
    </div>
  );
}
