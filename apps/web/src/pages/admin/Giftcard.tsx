import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, FieldError, Form, Input, Label, ListBox, Modal, Pagination, Select, Skeleton, Table, TextField } from "@heroui/react";
import { apiGet, apiGetEnvelope, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatCents, formatUnix } from "@/lib/format";
import type { Giftcard, Plan } from "@/lib/types";

export function AdminGiftcardPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState("1");
  const [planId, setPlanId] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "giftcard", "fetch", page],
    queryFn: () => apiGetEnvelope<Giftcard[]>(`/admin/giftcard/fetch?current=${page}&pageSize=20`)
  });
  const { data: plans } = useQuery({
    queryKey: ["admin", "plan", "fetch"],
    queryFn: () => apiGet<Plan[]>("/admin/plan/fetch")
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/giftcard/generate", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "giftcard", "fetch"] });
      setCreating(false);
    }
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/giftcard/drop", { id }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "giftcard", "fetch"] })
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));

  return (
    <>
      <PageHeader
        title="礼品卡"
        actions={<Button onPress={() => setCreating(true)}>批量生成</Button>}
      />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !data?.data?.length ? (
            <EmptyState title="暂无礼品卡" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="礼品卡列表">
                  <Table.Header>
                    <Table.Column isRowHeader>码</Table.Column>
                    <Table.Column>名称</Table.Column>
                    <Table.Column>类型</Table.Column>
                    <Table.Column>赠送</Table.Column>
                    <Table.Column>有效期</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.data.map((g) => (
                      <Table.Row key={g.id}>
                        <Table.Cell className="font-mono">{g.code}</Table.Cell>
                        <Table.Cell>{g.name}</Table.Cell>
                        <Table.Cell>
                          <Chip variant="default">{g.type === 1 ? "余额" : "订阅"}</Chip>
                        </Table.Cell>
                        <Table.Cell>
                          {g.type === 1
                            ? formatCents(g.value ?? 0)
                            : plans?.find((p) => p.id === g.plan_id)?.name ?? "?"}
                        </Table.Cell>
                        <Table.Cell className="text-xs">
                          {formatUnix(g.started_at, "YYYY-MM-DD")} ~ {formatUnix(g.ended_at, "YYYY-MM-DD")}
                        </Table.Cell>
                        <Table.Cell>
                          <Button size="sm" variant="danger" onPress={() => drop.mutate(g.id)}>
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
              <Modal.Heading>批量生成礼品卡</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form
                id="giftcard-form"
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const body: Record<string, unknown> = {
                    generate_count: Number(fd.get("generate_count") || 1),
                    name: fd.get("name"),
                    type: Number(type),
                    value: type === "1" ? Number(fd.get("value") || 0) : null,
                    plan_id: type === "2" ? Number(planId) : null,
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
                      <ListBox.Item id="1" textValue="余额">充值余额（单位：分）<ListBox.ItemIndicator /></ListBox.Item>
                      <ListBox.Item id="2" textValue="订阅">兑换订阅<ListBox.ItemIndicator /></ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
                {type === "1" ? (
                  <TextField name="value" type="number" isRequired>
                    <Label>余额值</Label>
                    <Input placeholder="如 500 表示 ¥5" />
                    <FieldError />
                  </TextField>
                ) : (
                  <Select selectedKey={planId} onSelectionChange={(k) => setPlanId(String(k))}>
                    <Label>对应订阅</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {(plans ?? []).map((p) => (
                          <ListBox.Item key={p.id} id={String(p.id)} textValue={p.name}>
                            {p.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}
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
              <Button type="submit" form="giftcard-form" isPending={create.isPending}>生成</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
