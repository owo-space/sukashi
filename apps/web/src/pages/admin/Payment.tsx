import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Chip, FieldError, Form, Input, Label, Modal, Skeleton, Switch, Table, TextField } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Snippet } from "@/components/Snippet";
import type { PaymentRow } from "@/lib/types";

export function AdminPaymentPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "payment", "fetch"],
    queryFn: () => apiGet<PaymentRow[]>("/admin/payment/fetch")
  });

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => apiPost("/admin/payment/save", body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "payment", "fetch"] });
      setEditing(null);
      setCreating(false);
    }
  });
  const drop = useMutation({
    mutationFn: (id: number) => apiPost("/admin/payment/drop", { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "payment", "fetch"] });
    }
  });
  const toggle = useMutation({
    mutationFn: ({ id, show }: { id: number; show: boolean }) =>
      apiPost("/admin/payment/show", { id, show: show ? 1 : 0 }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "payment", "fetch"] });
    }
  });

  const baseUrl = `${window.location.origin}/api/v1/guest/payment/notify/Stripe`;

  return (
    <>
      <PageHeader
        title="支付配置"
        description="目前仅支持 Stripe。Webhook 在保存后才能拿到完整地址。"
        actions={<Button onPress={() => setCreating(true)}>新增 Stripe 配置</Button>}
      />

      <Alert variant="default" className="mb-4">
        <div className="text-sm">
          Stripe Webhook 端点格式：<code className="mx-1 rounded bg-default-100 px-1 py-0.5">{baseUrl}/&lt;payment-uuid&gt;</code>
          。在 Stripe Dashboard → Developers → Webhooks 添加该地址，事件订阅
          <code className="mx-1">checkout.session.completed</code> 即可。
        </div>
      </Alert>

      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !data?.length ? (
            <EmptyState title="尚未配置支付方式" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="支付列表">
                  <Table.Header>
                    <Table.Column isRowHeader>名称</Table.Column>
                    <Table.Column>类型</Table.Column>
                    <Table.Column>Webhook</Table.Column>
                    <Table.Column>启用</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.map((p) => (
                      <Table.Row key={p.id}>
                        <Table.Cell>{p.name}</Table.Cell>
                        <Table.Cell>
                          <Chip variant="default" color="success">{p.payment}</Chip>
                        </Table.Cell>
                        <Table.Cell>
                          <Snippet value={`${baseUrl}/${p.uuid}`} />
                        </Table.Cell>
                        <Table.Cell>
                          <Switch
                            isSelected={p.enable}
                            onChange={(v) => toggle.mutate({ id: p.id, show: v })}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="secondary" onPress={() => setEditing(p)}>
                              编辑
                            </Button>
                            <Button size="sm" variant="danger" onPress={() => drop.mutate(p.id)}>
                              删除
                            </Button>
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

      <Modal.Backdrop
        isOpen={Boolean(editing) || creating}
        onOpenChange={(v) => !v && (setEditing(null), setCreating(false))}
      >
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[520px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{editing ? `编辑 ${editing.name}` : "新增 Stripe 配置"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Form
                id="payment-form"
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const body: Record<string, unknown> = {
                    payment: "Stripe",
                    name: fd.get("name"),
                    enable: fd.get("enable") === "on" ? 1 : 0,
                    config: {
                      stripe_public_key: fd.get("stripe_public_key") ?? "",
                      stripe_secret_key: fd.get("stripe_secret_key") ?? "",
                      stripe_webhook_secret: fd.get("stripe_webhook_secret") ?? "",
                      currency: (fd.get("currency") as string ?? "usd").toLowerCase()
                    }
                  };
                  if (editing) body.id = editing.id;
                  save.mutate(body);
                }}
              >
                <TextField name="name" defaultValue={editing?.name ?? "Stripe"} isRequired>
                  <Label>显示名称</Label>
                  <Input placeholder="对用户显示的名字，如 Credit Card" />
                  <FieldError />
                </TextField>
                <TextField name="stripe_public_key" defaultValue={(editing?.config as Record<string, string>)?.stripe_public_key ?? ""}>
                  <Label>Publishable Key (pk_...)</Label>
                  <Input placeholder="pk_live_..." />
                  <FieldError />
                </TextField>
                <TextField name="stripe_secret_key" defaultValue={(editing?.config as Record<string, string>)?.stripe_secret_key ?? ""} isRequired>
                  <Label>Secret Key (sk_...)</Label>
                  <Input placeholder="sk_live_..." />
                  <FieldError />
                </TextField>
                <TextField name="stripe_webhook_secret" defaultValue={(editing?.config as Record<string, string>)?.stripe_webhook_secret ?? ""} isRequired>
                  <Label>Webhook Signing Secret (whsec_...)</Label>
                  <Input placeholder="whsec_..." />
                  <FieldError />
                </TextField>
                <TextField name="currency" defaultValue={(editing?.config as Record<string, string>)?.currency ?? "usd"}>
                  <Label>货币 (ISO 4217 小写)</Label>
                  <Input placeholder="usd / hkd / cny" />
                  <FieldError />
                </TextField>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="enable" defaultChecked={editing?.enable ?? true} />
                  立即启用
                </label>
              </Form>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">取消</Button>
              <Button type="submit" form="payment-form" isPending={save.isPending}>保存</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
