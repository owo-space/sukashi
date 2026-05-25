import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton, Table } from "@heroui/react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatBytes, formatUnix } from "@/lib/format";
import type { TrafficLogRow } from "@/lib/types";

export function TrafficPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user", "stat", "getTrafficLog"],
    queryFn: () => apiGet<TrafficLogRow[]>("/user/stat/getTrafficLog")
  });

  // Group by record_at (day), summing u + d * rate to match V2Board's display.
  const grouped: Array<{ recordAt: number; up: number; down: number; total: number }> = [];
  for (const row of data ?? []) {
    const up = Number(row.u);
    const down = Number(row.d);
    const rate = Number(row.server_rate ?? 1);
    const existing = grouped.find((g) => g.recordAt === row.record_at);
    if (existing) {
      existing.up += up * rate;
      existing.down += down * rate;
      existing.total = existing.up + existing.down;
    } else {
      grouped.push({
        recordAt: row.record_at,
        up: up * rate,
        down: down * rate,
        total: (up + down) * rate
      });
    }
  }
  grouped.sort((a, b) => b.recordAt - a.recordAt);

  return (
    <>
      <PageHeader title="流量明细" description="按日汇总的本月流量使用情况。" />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : grouped.length === 0 ? (
            <EmptyState title="暂无流量记录" description="使用代理后会在 1 分钟内出现统计数据。" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="流量明细">
                  <Table.Header>
                    <Table.Column isRowHeader>日期</Table.Column>
                    <Table.Column>上行</Table.Column>
                    <Table.Column>下行</Table.Column>
                    <Table.Column>合计</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {grouped.map((g) => (
                      <Table.Row key={g.recordAt}>
                        <Table.Cell>{formatUnix(g.recordAt, "YYYY-MM-DD")}</Table.Cell>
                        <Table.Cell>{formatBytes(g.up)}</Table.Cell>
                        <Table.Cell>{formatBytes(g.down)}</Table.Cell>
                        <Table.Cell className="font-medium">{formatBytes(g.total)}</Table.Cell>
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
