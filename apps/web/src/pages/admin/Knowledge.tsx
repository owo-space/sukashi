import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { FormDialog, type FieldDef } from "@/components/admin/FormDialog";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatUnixDate } from "@/lib/format";
import type { KnowledgeItem } from "@/lib/types";

const FIELDS: FieldDef[] = [
  { key: "title", label: "标题", required: true, span: 2 },
  { key: "category", label: "分类", required: true },
  {
    key: "language",
    label: "语言",
    type: "select",
    options: [
      { value: "zh-CN", label: "简体中文" },
      { value: "zh-TW", label: "繁体中文" },
      { value: "en-US", label: "English" },
      { value: "ja-JP", label: "日本語" }
    ]
  },
  { key: "body", label: "正文 (Markdown / HTML)", type: "textarea", span: 2, required: true },
  { key: "show", label: "对外显示", type: "switch", span: 2 }
];

export function AdminKnowledgePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.knowledge.fetch"],
    queryFn: () => apiGet<KnowledgeItem[]>("/admin/knowledge/fetch")
  });

  const [editing, setEditing] = useState<Partial<KnowledgeItem> | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost("/admin/knowledge/save", input),
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
      <Card>
        <CardContent className="flex flex-col gap-3 py-3">
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing({});
                setValues({ show: 1, language: "zh-CN" });
              }}
            >
              <Plus className="size-4" />
              添加文章
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
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
                    <TableCell>{k.id}</TableCell>
                    <TableCell>
                      <Switch checked={Boolean(k.show)} onCheckedChange={() => showToggle.mutate(k)} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{k.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{k.title}</TableCell>
                    <TableCell>{k.language ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{formatUnixDate(k.updated_at)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(k);
                          setValues({
                            id: k.id,
                            title: k.title,
                            category: k.category ?? "",
                            language: k.language ?? "zh-CN",
                            body: k.body ?? "",
                            show: k.show ? 1 : 0
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
                          if (confirm(`删除文章 "${k.title}"？`)) drop.mutate(k.id);
                        }}
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

      <FormDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing && "id" in editing ? "编辑文章" : "添加文章"}
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
