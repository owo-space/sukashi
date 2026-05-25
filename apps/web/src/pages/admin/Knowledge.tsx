import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, FieldError, Form, Input, Label, Modal, Skeleton, Table, TextArea, TextField } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatUnix } from "@/lib/format";
import type { KnowledgeItem } from "@/lib/types";

export function AdminKnowledgePage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<KnowledgeItem | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "knowledge", "fetch"],
    queryFn: () => apiGet<KnowledgeItem[]>("/admin/knowledge/fetch")
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/knowledge/save", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "knowledge", "fetch"] });
      setEditing(null);
      setCreating(false);
    }
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/knowledge/drop", { id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "knowledge", "fetch"] })
  });

  return (
    <>
      <PageHeader
        title="知识库"
        actions={<Button onPress={() => setCreating(true)}>新建文档</Button>}
      />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !data?.length ? (
            <EmptyState title="暂无文档" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="知识库列表">
                  <Table.Header>
                    <Table.Column isRowHeader>标题</Table.Column>
                    <Table.Column>分类</Table.Column>
                    <Table.Column>语言</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>更新时间</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.map((k) => (
                      <Table.Row key={k.id}>
                        <Table.Cell>{k.title}</Table.Cell>
                        <Table.Cell>{k.category}</Table.Cell>
                        <Table.Cell>{k.language}</Table.Cell>
                        <Table.Cell>
                          {k.show ? (
                            <Chip variant="default" color="success">显示</Chip>
                          ) : (
                            <Chip variant="default">隐藏</Chip>
                          )}
                        </Table.Cell>
                        <Table.Cell>{formatUnix(k.updated_at)}</Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onPress={() => setEditing(k)}>编辑</Button>
                            <Button size="sm" variant="danger" onPress={() => drop.mutate(k.id)}>删除</Button>
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
          <Modal.Dialog className="sm:max-w-[640px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{editing ? `编辑文档 #${editing.id}` : "新建文档"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form
                id="knowledge-form"
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const body: Record<string, unknown> = {
                    language: fd.get("language"),
                    category: fd.get("category"),
                    title: fd.get("title"),
                    body: fd.get("body"),
                    sort: Number(fd.get("sort") || 0),
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
                <div className="grid grid-cols-3 gap-3">
                  <TextField name="category" defaultValue={editing?.category ?? "客户端配置"} isRequired>
                    <Label>分类</Label>
                    <Input />
                    <FieldError />
                  </TextField>
                  <TextField name="language" defaultValue={editing?.language ?? "zh-CN"}>
                    <Label>语言</Label>
                    <Input />
                    <FieldError />
                  </TextField>
                  <TextField name="sort" type="number" defaultValue={String(editing?.sort ?? 1)}>
                    <Label>排序</Label>
                    <Input />
                    <FieldError />
                  </TextField>
                </div>
                <div>
                  <Label>正文（支持 HTML / Markdown，按 HTML 渲染）</Label>
                  <TextArea name="body" defaultValue={editing?.body ?? ""} rows={12} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="show" defaultChecked={editing?.show ?? true} />
                  对用户可见
                </label>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">取消</Button>
              <Button type="submit" form="knowledge-form" isPending={save.isPending}>保存</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
