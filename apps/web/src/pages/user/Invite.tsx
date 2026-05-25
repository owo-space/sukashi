import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Skeleton, Table } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Snippet } from "@/components/Snippet";
import { EmptyState } from "@/components/EmptyState";
import { formatCents, formatUnix } from "@/lib/format";
import type { InviteStat, CommissionLog } from "@/lib/types";

export function InvitePage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["user", "invite", "fetch"],
    queryFn: () => apiGet<InviteStat>("/user/invite/fetch")
  });
  const { data: details } = useQuery({
    queryKey: ["user", "invite", "details"],
    queryFn: () => apiGet<CommissionLog[]>("/user/invite/details")
  });

  const create = useMutation({
    mutationFn: () => apiPost("/user/invite/save"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user", "invite", "fetch"] });
    }
  });

  if (isLoading || !data) {
    return <Skeleton className="h-72 w-full rounded-xl" />;
  }

  const [activeCodes = 0, invitedUsers = 0, commissionCount = 0, commissionTotal = 0] = data.stat;
  const baseUrl = window.location.origin;

  return (
    <>
      <PageHeader
        title="邀请佣金"
        actions={<Button onPress={() => create.mutate()} isPending={create.isPending}>生成新邀请码</Button>}
      />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="可用邀请码" value={activeCodes} />
        <StatCard label="已邀请用户" value={invitedUsers} />
        <StatCard label="佣金记录" value={commissionCount} />
        <StatCard label="累计佣金" value={formatCents(commissionTotal)} />
      </div>

      <Card className="mt-4">
        <Card.Header>
          <Card.Title>我的邀请码</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-2">
          {data.codes.length === 0 ? (
            <EmptyState title="还没有邀请码" description="点击右上角「生成新邀请码」开始邀请。" />
          ) : (
            data.codes.map((c) => (
              <Snippet key={c.id} className="w-full" value={`${baseUrl}/register?code=${c.code}`} />
            ))
          )}
        </Card.Content>
      </Card>

      <Card className="mt-4">
        <Card.Header>
          <Card.Title>佣金明细</Card.Title>
        </Card.Header>
        <Card.Content className="p-0">
          {!details || details.length === 0 ? (
            <EmptyState title="暂无佣金记录" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="佣金记录">
                  <Table.Header>
                    <Table.Column isRowHeader>订单号</Table.Column>
                    <Table.Column>订单金额</Table.Column>
                    <Table.Column>佣金</Table.Column>
                    <Table.Column>时间</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {details.map((l) => (
                      <Table.Row key={l.id}>
                        <Table.Cell className="font-mono text-xs">{l.trade_no}</Table.Cell>
                        <Table.Cell>{formatCents(l.order_amount)}</Table.Cell>
                        <Table.Cell>{formatCents(l.get_amount)}</Table.Cell>
                        <Table.Cell>{formatUnix(l.created_at)}</Table.Cell>
                      </Table.Row>
                    ))}
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

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <Card.Content>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-sm text-muted">{label}</div>
      </Card.Content>
    </Card>
  );
}
