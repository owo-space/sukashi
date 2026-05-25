import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, Modal, Pagination, Skeleton, Table, TextArea } from "@heroui/react";
import { apiGet, apiGetEnvelope, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatUnix } from "@/lib/format";
import type { Ticket } from "@/lib/types";

const STATUS: Record<number, { label: string; color: "default" | "success" | "warning" | "danger" }> = {
  0: { label: "处理中", color: "warning" },
  1: { label: "已关闭", color: "default" }
};

const LEVEL: Record<number, { label: string; color: "default" | "success" | "warning" | "danger" }> = {
  0: { label: "低", color: "default" },
  1: { label: "中", color: "warning" },
  2: { label: "高", color: "danger" }
};

export function AdminTicketPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);
  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "ticket", "fetch", page],
    queryFn: () => apiGetEnvelope<Ticket[]>(`/admin/ticket/fetch?current=${page}&pageSize=20`)
  });

  const { data: detail } = useQuery({
    queryKey: ["admin", "ticket", "fetch", openTicket?.id],
    queryFn: () => apiGet<Ticket>(`/admin/ticket/fetch?id=${openTicket?.id}`),
    enabled: Boolean(openTicket)
  });

  const reply = useMutation({
    mutationFn: () => apiPost("/admin/ticket/reply", { id: openTicket?.id, message }),
    onSuccess: () => {
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["admin", "ticket", "fetch"] });
    }
  });
  const close = useMutation({
    mutationFn: (id: number) => apiPost("/admin/ticket/close", { id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "ticket", "fetch"] });
      setOpenTicket(null);
    }
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));

  return (
    <>
      <PageHeader title="工单管理" />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !data?.data?.length ? (
            <EmptyState title="暂无工单" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="工单列表">
                  <Table.Header>
                    <Table.Column isRowHeader>ID</Table.Column>
                    <Table.Column>用户</Table.Column>
                    <Table.Column>标题</Table.Column>
                    <Table.Column>级别</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>最后更新</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.data.map((t) => {
                      const s = STATUS[t.status] ?? STATUS[0]!;
                      const l = LEVEL[t.level] ?? LEVEL[0]!;
                      return (
                        <Table.Row key={t.id}>
                          <Table.Cell>{t.id}</Table.Cell>
                          <Table.Cell>{t.user_id}</Table.Cell>
                          <Table.Cell>{t.subject}</Table.Cell>
                          <Table.Cell>
                            <Chip variant="default" color={l.color}>{l.label}</Chip>
                          </Table.Cell>
                          <Table.Cell>
                            <Chip variant="default" color={s.color}>{s.label}</Chip>
                          </Table.Cell>
                          <Table.Cell>{formatUnix(t.updated_at)}</Table.Cell>
                          <Table.Cell>
                            <Button size="sm" variant="secondary" onPress={() => setOpenTicket(t)}>
                              查看
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
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

      <Modal.Backdrop isOpen={Boolean(openTicket)} onOpenChange={(v) => !v && setOpenTicket(null)}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[640px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{openTicket?.subject}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-3">
              {(detail?.message ?? []).map((m) => (
                <div key={m.id} className={`rounded-md p-2 text-sm ${m.user_id === openTicket?.user_id ? "bg-default-100" : "bg-primary/10"}`}>
                  <div className="mb-1 text-xs text-muted">
                    {m.user_id === openTicket?.user_id ? "用户" : "管理员"} · {formatUnix(m.created_at)}
                  </div>
                  <div className="whitespace-pre-wrap">{m.message}</div>
                </div>
              ))}
              {openTicket?.status === 0 ? (
                <div className="border-t border-default-200 pt-3">
                  <TextArea
                    aria-label="回复"
                    value={message}
                    onChange={setMessage}
                    placeholder="回复内容…"
                    rows={4}
                  />
                </div>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              {openTicket?.status === 0 ? (
                <>
                  <Button variant="danger-soft" onPress={() => openTicket && close.mutate(openTicket.id)}>
                    关闭工单
                  </Button>
                  <Button onPress={() => reply.mutate()} isDisabled={!message.trim()} isPending={reply.isPending}>
                    发送回复
                  </Button>
                </>
              ) : (
                <Button slot="close" variant="tertiary">关闭</Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
