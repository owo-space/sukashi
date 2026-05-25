import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Chip, Input, Pagination, Skeleton, Table } from "@heroui/react";
import { apiGetEnvelope, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatCents, formatUnix } from "@/lib/format";
import type { Order } from "@/lib/types";

const STATUS: Record<number, { label: string; color: "default" | "success" | "warning" | "danger" }> = {
  0: { label: "待支付", color: "warning" },
  1: { label: "处理中", color: "default" },
  2: { label: "已取消", color: "danger" },
  3: { label: "已支付", color: "success" },
  4: { label: "已退款", color: "default" }
};

export function AdminOrderPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [tradeNoFilter, setTradeNoFilter] = useState("");

  const filter = tradeNoFilter ? `&filter=${encodeURIComponent(JSON.stringify([{ key: "trade_no", condition: "=", value: tradeNoFilter }]))}` : "";
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order", "fetch", page, tradeNoFilter],
    queryFn: () =>
      apiGetEnvelope<Order[]>(`/admin/order/fetch?current=${page}&pageSize=20${filter}`)
  });

  const markPaid = useMutation({
    mutationFn: (tradeNo: string) => apiPost("/admin/order/paid", { trade_no: tradeNo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "order", "fetch"] });
    }
  });
  const cancel = useMutation({
    mutationFn: (tradeNo: string) => apiPost("/admin/order/cancel", { trade_no: tradeNo }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "order", "fetch"] });
    }
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <>
      <PageHeader
        title="订单管理"
        actions={
          <Input
            value={tradeNoFilter}
            onChange={(e) => {
              setTradeNoFilter(e.target.value);
              setPage(1);
            }}
            placeholder="订单号精确搜索"
            className="w-64"
          />
        }
      />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data?.data?.length ? (
            <EmptyState title="暂无订单" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="订单列表" className="min-w-[800px]">
                  <Table.Header>
                    <Table.Column isRowHeader>订单号</Table.Column>
                    <Table.Column>用户 ID</Table.Column>
                    <Table.Column>金额</Table.Column>
                    <Table.Column>周期</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>时间</Table.Column>
                    <Table.Column>操作</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.data.map((o) => {
                      const s = STATUS[o.status] ?? STATUS[0]!;
                      return (
                        <Table.Row key={o.id}>
                          <Table.Cell className="font-mono text-xs">{o.trade_no}</Table.Cell>
                          <Table.Cell>{o.user_id}</Table.Cell>
                          <Table.Cell>{formatCents(o.total_amount)}</Table.Cell>
                          <Table.Cell>{o.period}</Table.Cell>
                          <Table.Cell>
                            <Chip variant="default" color={s.color}>{s.label}</Chip>
                          </Table.Cell>
                          <Table.Cell>{formatUnix(o.created_at)}</Table.Cell>
                          <Table.Cell>
                            {o.status === 0 ? (
                              <div className="flex gap-1">
                                <Button size="sm" variant="secondary" onPress={() => markPaid.mutate(o.trade_no)}>
                                  标记已支付
                                </Button>
                                <Button size="sm" variant="danger" onPress={() => cancel.mutate(o.trade_no)}>
                                  取消
                                </Button>
                              </div>
                            ) : null}
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
    </>
  );
}
