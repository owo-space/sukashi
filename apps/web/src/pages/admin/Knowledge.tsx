import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { formatUnixDate } from "@/lib/format";
import type { KnowledgeItem } from "@/lib/types";

export function AdminKnowledgePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.knowledge.fetch"],
    queryFn: () => apiGet<KnowledgeItem[]>("/admin/knowledge/fetch")
  });

  const [editing, setEditing] = useState<{ mode: "create" | "edit"; row?: KnowledgeItem } | null>(
    null
  );
  const [form, setForm] = useState<Record<string, unknown>>({ show: 1, language: "zh-CN" });

  const save = useMutation({
    mutationFn: () => apiPost("/admin/knowledge/save", form),
    onSuccess: () => {
      toast.success("已保存");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.knowledge.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });
  const showToggle = useMutation({
    mutationFn: (k: KnowledgeItem) =>
      apiPost("/admin/knowledge/show", { id: k.id, show: k.show ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.knowledge.fetch"] })
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/knowledge/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.knowledge.fetch"] })
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
                setForm({ show: 1, language: "zh-CN" });
                setEditing({ mode: "create" });
              }}
            >
              <Plus className="size-4" />
              添加文章
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 hover:bg-transparent">
                <TableHead className="text-slate-500">ID</TableHead>
                <TableHead className="text-slate-500">显示</TableHead>
                <TableHead className="text-slate-500">分类</TableHead>
                <TableHead className="text-slate-500">标题</TableHead>
                <TableHead className="text-slate-500">语言</TableHead>
                <TableHead className="text-slate-500">更新时间</TableHead>
                <TableHead className="text-right text-slate-500">操作</TableHead>
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
                  <TableRow key={k.id} className="border-b border-slate-100">
                    <TableCell className="text-slate-600">{k.id}</TableCell>
                    <TableCell>
                      <Switch checked={Boolean(k.show)} onCheckedChange={() => showToggle.mutate(k)} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded border border-slate-200 px-2 py-0.5 text-xs">
                        {k.category}
                      </span>
                    </TableCell>
                    <TableCell>{k.title}</TableCell>
                    <TableCell className="text-slate-600">{k.language ?? "-"}</TableCell>
                    <TableCell className="text-xs text-slate-500">{formatUnixDate(k.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        <DropdownMenuItem
                          onClick={() => {
                            setForm({
                              id: k.id,
                              title: k.title,
                              category: k.category ?? "",
                              language: k.language ?? "zh-CN",
                              body: k.body ?? "",
                              show: k.show ? 1 : 0
                            });
                            setEditing({ mode: "edit", row: k });
                          }}
                        >
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`删除文章 "${k.title}"？`)) drop.mutate(k.id);
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
        title={editing?.mode === "edit" ? "编辑文章" : "新建文章"}
        width={560}
        submitting={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <div className="flex flex-col gap-3">
          <Field label="标题" required>
            <Input
              value={String(form.title ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="分类" required>
              <Input
                value={String(form.category ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              />
            </Field>
            <Field label="语言">
              <Select
                value={String(form.language ?? "zh-CN")}
                onValueChange={(v) => setForm((f) => ({ ...f, language: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">简体中文</SelectItem>
                  <SelectItem value="zh-TW">繁体中文</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                  <SelectItem value="ja-JP">日本語</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="正文 (Markdown / HTML)" required>
            <Textarea
              rows={12}
              value={String(form.body ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </Field>
          <Field label="对外显示">
            <Switch
              checked={Boolean(form.show)}
              onCheckedChange={(c) => setForm((f) => ({ ...f, show: c ? 1 : 0 }))}
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
