import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, FieldError, Form, Input, Label, ListBox, Modal, Pagination, Select, Skeleton, Table, TextField } from "@heroui/react";
import { apiGetEnvelope, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatCents, formatUnix } from "@/lib/format";
import type { Coupon } from "@/lib/types";

export function AdminCouponPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState("1");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "coupon", "fetch", page],
    queryFn: () => apiGetEnvelope<Coupon[]>(`/admin/coupon/fetch?current=${page}&pageSize=20`)
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/coupon/generate", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "coupon", "fetch"] });
      setCreating(false);
    }
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/coupon/drop", { id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "coupon", "fetch"] })
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));

  return (
    <>
      <PageHeader
        title="优惠券"
        actions={<Button onPress={() => setCreating(true)}>批量生成</Button>}
      />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !data?.data?.length ? (
            <EmptyState title="暂无优惠券" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="优惠券列表">
                  <Table.Header>
                    <Table.Column isRowHeader>码</Table.Column>
                    <Table.Column>名称</Table.Column>
                    <Table.Column>类型</Table.Column>
                    <Table.Column>价值</Table.Column>
                    <Table.Column>限用次数</Table.Column>
                    <Table.Column>有效期</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.data.map((c) => (
                      <Table.Row key={c.id}>
                        <Table.Cell className="font-mono">{c.code}</Table.Cell>
                        <Table.Cell>{c.name}</Table.Cell>
                        <Table.Cell>
                          <Chip variant="default">{c.type === 1 ? "金额减免" : "百分比"}</Chip>
                        </Table.Cell>
                        <Table.Cell>{c.type === 1 ? formatCents(c.value) : `${c.value}%`}</Table.Cell>
                        <Table.Cell>{c.limit_use ?? "∞"}</Table.Cell>
                        <Table.Cell className="text-xs">
                          {formatUnix(c.started_at, "YYYY-MM-DD")} ~ {formatUnix(c.ended_at, "YYYY-MM-DD")}
                        </Table.Cell>
                        <Table.Cell>
                          <Button size="sm" variant="danger" onPress={() => drop.mutate(c.id)}>
                            删除
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Card.Content>
        {totalPages > 1 ? (
          <Card.Footer className="flex justify-center">
            <Pagination total={totalPages} page={page} onChange={setPage} />
          </Card.Footer>
        ) : null}
      </Card>

      <Modal.Backdrop isOpen={creating} onOpenChange={(v) => !v && setCreating(false)}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[480px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>批量生成优惠券</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form
                id="coupon-form"
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const body: Record<string, unknown> = {
                    generate_count: Number(fd.get("generate_count") || 1),
                    name: fd.get("name"),
                    type: Number(type),
                    value: Number(fd.get("value") || 0),
                    limit_use: fd.get("limit_use") ? Number(fd.get("limit_use")) : null,
                    started_at: Math.floor(new Date(String(fd.get("started_at"))).getTime() / 1000),
                    ended_at: Math.floor(new Date(String(fd.get("ended_at"))).getTime() / 1000)
                  };
                  create.mutate(body);
                }}
              >
                <TextField name="generate_count" defaultValue="10" type="number" isRequired>
                  <Label>生成数量</Label>
                  <Input />
                  <FieldError />
                </TextField>
                <TextField name="name" isRequired>
                  <Label>名称</Label>
                  <Input />
                  <FieldError />
                </TextField>
                <Select selectedKey={type} onSelectionChange={(k) => setType(String(k))}>
                  <Label>类型</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="1" textValue="金额减免">金额减免（单位：分）<ListBox.ItemIndicator /></ListBox.Item>
                      <ListBox.Item id="2" textValue="百分比">百分比 (%)<ListBox.ItemIndicator /></ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
                <TextField name="value" type="number" isRequired>
                  <Label>价值</Label>
                  <Input placeholder={type === "1" ? "如 500 表示 ¥5" : "如 20 表示 20%"} />
                  <FieldError />
                </TextField>
                <TextField name="limit_use" type="number">
                  <Label>限制使用次数（留空则无限）</Label>
                  <Input />
                  <FieldError />
                </TextField>
                <TextField name="started_at" type="datetime-local" isRequired>
                  <Label>生效时间</Label>
                  <Input />
                  <FieldError />
                </TextField>
                <TextField name="ended_at" type="datetime-local" isRequired>
                  <Label>结束时间</Label>
                  <Input />
                  <FieldError />
                </TextField>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">取消</Button>
              <Button type="submit" form="coupon-form" isPending={create.isPending}>生成</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
