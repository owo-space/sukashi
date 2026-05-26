import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { FormDialog, type FieldDef } from "@/components/admin/FormDialog";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatUnixDate } from "@/lib/format";
import type { NoticeItem } from "@/lib/types";

const FIELDS: FieldDef[] = [
  { key: "title", label: "标题", required: true, span: 2 },
  { key: "img_url", label: "图片 URL", span: 2 },
  { key: "content", label: "正文 (HTML)", type: "textarea", span: 2, required: true },
  { key: "show", label: "对外显示", type: "switch", span: 2 }
];

export function AdminNoticePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.notice.fetch"],
    queryFn: () => apiGet<NoticeItem[]>("/admin/notice/fetch")
  });

  const [editing, setEditing] = useState<Partial<NoticeItem> | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});

  const save = useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost("/admin/notice/save", input),
    onSuccess: () => {
      toast.success("已保存");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin.notice.fetch"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  const showToggle = useMutation({
    mutationFn: (n: NoticeItem) => apiPost("/admin/notice/show", { id: n.id, show: n.show ? 0 : 1 }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.notice.fetch"] })
  });

  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/notice/drop", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.notice.fetch"] })
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
                setValues({ show: 1 });
              }}
            >
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
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(n);
                          setValues({
                            id: n.id,
                            title: n.title,
                            content: n.content,
                            img_url: n.img_url ?? "",
                            show: n.show ? 1 : 0
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
                          if (confirm(`删除公告 "${n.title}"？`)) drop.mutate(n.id);
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
        title={editing && "id" in editing ? "编辑公告" : "添加公告"}
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
