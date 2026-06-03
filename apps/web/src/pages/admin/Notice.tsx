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
import type { NoticeItem } from "@/lib/types";

export function AdminNoticePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.notice.fetch"],
    queryFn: () => apiGet<NoticeItem[]>("/admin/notice/fetch")
  });

  const [editing, setEditing] = useState<{ mode: "create" | "edit"; row?: NoticeItem } | null>(
    null
  );
  const [form, setForm] = useState<Record<string, unknown>>({ show: 1 });

  const save = useMutation({
    mutationFn: () => apiPost("/admin/notice/save", form),
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
      <Card className="rounded">
        <CardContent className="p-0">
          <div className="px-6 py-3 border-b border-border">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1"
              onClick={() => {
                setForm({ show: 1 });
                setEditing({ mode: "create" });
              }}
            >
              <Plus className="size-4" />
              添加公告
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">ID</TableHead>
                <TableHead className="text-muted-foreground">显示</TableHead>
                <TableHead className="text-muted-foreground">标题</TableHead>
                <TableHead className="text-muted-foreground">更新时间</TableHead>
                <TableHead className="text-right text-muted-foreground">操作</TableHead>
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
                  <TableRow key={n.id} className="border-b border-border">
                    <TableCell className="text-foreground/80">{n.id}</TableCell>
                    <TableCell>
                      <Switch
                        checked={Boolean(n.show)}
                        onCheckedChange={() => showToggle.mutate(n)}
                      />
                    </TableCell>
                    <TableCell>{n.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatUnixDate(n.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions>
                        <DropdownMenuItem
                          onClick={() => {
                            setForm({
                              id: n.id,
                              title: n.title,
                              content: n.content,
                              img_url: n.img_url ?? "",
                              show: n.show ? 1 : 0
                            });
                            setEditing({ mode: "edit", row: n });
                          }}
                        >
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`删除公告 "${n.title}"？`)) drop.mutate(n.id);
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
        title={editing?.mode === "edit" ? "编辑公告" : "新建公告"}
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
          <Field label="图片 URL">
            <Input
              value={String(form.img_url ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, img_url: e.target.value }))}
            />
          </Field>
          <Field label="正文 (HTML)" required>
            <Textarea
              rows={10}
              value={String(form.content ?? "")}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
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
