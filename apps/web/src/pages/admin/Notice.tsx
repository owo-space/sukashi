import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, FieldError, Form, Input, Label, Modal, Skeleton, Table, TextArea, TextField } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatUnix } from "@/lib/format";
import type { Notice } from "@/lib/types";

export function AdminNoticePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Notice | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "notice", "fetch"],
    queryFn: () => apiGet<Notice[]>("/admin/notice/fetch")
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/notice/save", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "notice", "fetch"] });
      setEditing(null);
      setCreating(false);
    }
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/notice/drop", { id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "notice", "fetch"] })
  });

  return (
    <>
      <PageHeader
        title="公告"
        actions={<Button onPress={() => setCreating(true)}>新建公告</Button>}
      />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !data?.length ? (
            <EmptyState title="暂无公告" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="公告列表">
                  <Table.Header>
                    <Table.Column isRowHeader>标题</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>更新时间</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.map((n) => (
                      <Table.Row key={n.id}>
                        <Table.Cell>{n.title}</Table.Cell>
                        <Table.Cell>
                          {n.show ? (
                            <Chip variant="default" color="success">已发布</Chip>
                          ) : (
                            <Chip variant="default">草稿</Chip>
                          )}
                        </Table.Cell>
                        <Table.Cell>{formatUnix(n.updated_at)}</Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onPress={() => setEditing(n)}>编辑</Button>
                            <Button size="sm" variant="danger" onPress={() => drop.mutate(n.id)}>删除</Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Card.Content>
      </Card>

      <Modal.Backdrop isOpen={Boolean(editing) || creating} onOpenChange={(v) => !v && (setEditing(null), setCreating(false))}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[600px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{editing ? `编辑公告 #${editing.id}` : "新建公告"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form
                id="notice-form"
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const body: Record<string, unknown> = {
                    title: fd.get("title"),
                    content: fd.get("content"),
                    img_url: fd.get("img_url") || null,
                    tags: fd.get("tags") || null,
                    show: fd.get("show") === "on"
                  };
                  if (editing) body.id = editing.id;
                  save.mutate(body);
                }}
              >
                <TextField name="title" defaultValue={editing?.title ?? ""} isRequired>
                  <Label>标题</Label>
                  <Input />
                  <FieldError />
                </TextField>
                <TextField name="img_url" defaultValue={editing?.img_url ?? ""}>
                  <Label>封面图 URL（可选）</Label>
                  <Input />
                  <FieldError />
                </TextField>
                <TextField name="tags" defaultValue={editing?.tags ?? ""}>
                  <Label>标签</Label>
                  <Input placeholder="逗号分隔" />
                  <FieldError />
                </TextField>
                <div>
                  <Label>内容（支持 HTML）</Label>
                  <TextArea name="content" defaultValue={editing?.content ?? ""} rows={10} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="show" defaultChecked={editing?.show ?? true} />
                  立即发布
                </label>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">取消</Button>
              <Button type="submit" form="notice-form" isPending={save.isPending}>保存</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
