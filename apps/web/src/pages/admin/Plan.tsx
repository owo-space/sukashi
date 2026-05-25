import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, FieldError, Form, Input, Label, Modal, NumberField, Skeleton, Switch, Table, TextArea, TextField } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatCents } from "@/lib/format";
import type { Plan } from "@/lib/types";

export function AdminPlanPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "plan", "fetch"],
    queryFn: () => apiGet<Plan[]>("/admin/plan/fetch")
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/plan/save", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "plan", "fetch"] });
      setEditing(null);
      setCreating(false);
    }
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/plan/drop", { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "plan", "fetch"] });
    }
  });

  return (
    <>
      <PageHeader
        title="订阅管理"
        actions={<Button onPress={() => setCreating(true)}>新建订阅</Button>}
      />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data?.length ? (
            <EmptyState title="暂无订阅" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="订阅列表">
                  <Table.Header>
                    <Table.Column isRowHeader>名称</Table.Column>
                    <Table.Column>流量 (GB)</Table.Column>
                    <Table.Column>月付</Table.Column>
                    <Table.Column>用户数</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.map((p) => (
                      <Table.Row key={p.id}>
                        <Table.Cell>{p.name}</Table.Cell>
                        <Table.Cell>{p.transfer_enable}</Table.Cell>
                        <Table.Cell>{p.month_price ? formatCents(p.month_price) : "-"}</Table.Cell>
                        <Table.Cell>{p.count ?? 0}</Table.Cell>
                        <Table.Cell>
                          {p.show ? (
                            <Chip variant="default" color="success">上架</Chip>
                          ) : (
                            <Chip variant="default">下架</Chip>
                          )}
                          {!p.renew ? <Chip variant="default" color="warning" className="ml-1">停售</Chip> : null}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onPress={() => setEditing(p)}>编辑</Button>
                            <Button size="sm" variant="danger" onPress={() => drop.mutate(p.id)}>删除</Button>
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

      <PlanModal
        plan={editing ?? null}
        open={Boolean(editing) || creating}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSave={(body) => save.mutate(body)}
        saving={save.isPending}
      />
    </>
  );
}

function PlanModal({
  plan,
  open,
  onClose,
  onSave,
  saving
}: {
  plan: Plan | null;
  open: boolean;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  saving: boolean;
}) {
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={(v) => !v && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-[640px]">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{plan ? `编辑订阅 #${plan.id}` : "新建订阅"}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Form
              id="plan-form"
              className="grid grid-cols-2 gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const body: Record<string, unknown> = {};
                if (plan) body.id = plan.id;
                for (const key of [
                  "name",
                  "group_id",
                  "transfer_enable",
                  "device_limit",
                  "speed_limit",
                  "content",
                  "capacity_limit",
                  "month_price",
                  "quarter_price",
                  "half_year_price",
                  "year_price",
                  "two_year_price",
                  "three_year_price",
                  "onetime_price",
                  "reset_price",
                  "reset_traffic_method"
                ]) {
                  const v = fd.get(key);
                  if (v !== null && v !== "") body[key] = v;
                }
                body.show = fd.get("show") === "on" ? 1 : 0;
                body.renew = fd.get("renew") === "on" ? 1 : 0;
                onSave(body);
              }}
            >
              <TextField className="col-span-2" name="name" defaultValue={plan?.name ?? ""} isRequired>
                <Label>名称</Label>
                <Input />
                <FieldError />
              </TextField>
              <TextField name="group_id" defaultValue={String(plan?.group_id ?? "")}>
                <Label>权限组 ID</Label>
                <Input type="number" />
                <FieldError />
              </TextField>
              <TextField name="transfer_enable" defaultValue={String(plan?.transfer_enable ?? "")}>
                <Label>流量 (GB)</Label>
                <Input type="number" />
                <FieldError />
              </TextField>
              <TextField name="device_limit" defaultValue={String(plan?.device_limit ?? "")}>
                <Label>设备数</Label>
                <Input type="number" />
                <FieldError />
              </TextField>
              <TextField name="speed_limit" defaultValue={String(plan?.speed_limit ?? "")}>
                <Label>速度限制 (Mbps)</Label>
                <Input type="number" />
                <FieldError />
              </TextField>
              <TextField name="capacity_limit" defaultValue={String(plan?.capacity_limit ?? "")}>
                <Label>容量上限</Label>
                <Input type="number" />
                <FieldError />
              </TextField>
              <TextField name="reset_traffic_method" defaultValue={String(plan?.reset_traffic_method ?? "")}>
                <Label>流量重置方式</Label>
                <Input type="number" placeholder="0=不重置 1=月首 2=年首 3=按月 4=按年" />
                <FieldError />
              </TextField>
              <div className="col-span-2">
                <Label>套餐描述（支持 HTML）</Label>
                <TextArea name="content" defaultValue={plan?.content ?? ""} rows={4} />
              </div>
              {[
                ["month_price", "月付价格 (分)"],
                ["quarter_price", "季付价格 (分)"],
                ["half_year_price", "半年价格 (分)"],
                ["year_price", "年付价格 (分)"],
                ["two_year_price", "两年价格 (分)"],
                ["three_year_price", "三年价格 (分)"],
                ["onetime_price", "一次性价格 (分)"],
                ["reset_price", "重置流量价格 (分)"]
              ].map(([key, label]) => (
                <TextField key={key} name={key} defaultValue={String(plan?.[key as keyof Plan] ?? "")}>
                  <Label>{label}</Label>
                  <Input type="number" />
                  <FieldError />
                </TextField>
              ))}
              <label className="col-span-1 flex items-center gap-2 text-sm">
                <input type="checkbox" name="show" defaultChecked={Boolean(plan?.show ?? 1)} />
                上架销售
              </label>
              <label className="col-span-1 flex items-center gap-2 text-sm">
                <input type="checkbox" name="renew" defaultChecked={Boolean(plan?.renew ?? 1)} />
                允许续费
              </label>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="tertiary">取消</Button>
            <Button type="submit" form="plan-form" isPending={saving}>保存</Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
