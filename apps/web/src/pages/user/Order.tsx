import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, Chip, Skeleton, Table } from "@heroui/react";
import { apiGet } from "@/lib/api";
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

const TYPE: Record<number, string> = {
  1: "新购",
  2: "续费",
  3: "更换订阅",
  4: "重置流量"
};

export function OrderPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user", "order", "fetch"],
    queryFn: () => apiGet<Order[]>("/user/order/fetch")
  });

  return (
    <>
      <PageHeader title="我的订单" description="查看历史订单及支付状态。" />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data || data.length === 0 ? (
            <EmptyState title="暂无订单" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="订单列表">
                  <Table.Header>
                    <Table.Column isRowHeader>订单号</Table.Column>
                    <Table.Column>类型</Table.Column>
                    <Table.Column>周期</Table.Column>
                    <Table.Column>金额</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>创建时间</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.map((o) => {
                      const status = STATUS[o.status] ?? STATUS[0]!;
                      return (
                        <Table.Row key={o.id}>
                          <Table.Cell>
                            <Link
                              to={`/order/${o.trade_no}`}
                              className="font-mono text-sm text-primary hover:underline"
                            >
                              {o.trade_no}
                            </Link>
                          </Table.Cell>
                          <Table.Cell>{TYPE[o.type] ?? "-"}</Table.Cell>
                          <Table.Cell>{o.period}</Table.Cell>
                          <Table.Cell>{formatCents(o.total_amount)}</Table.Cell>
                          <Table.Cell>
                            <Chip variant="default" color={status.color}>
                              {status.label}
                            </Chip>
                          </Table.Cell>
                          <Table.Cell>{formatUnix(o.created_at)}</Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          )}
        </Card.Content>
      </Card>
    </>
  );
}
