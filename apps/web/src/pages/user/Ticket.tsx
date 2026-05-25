import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Chip, Skeleton, Table } from "@heroui/react";
import { Plus } from "lucide-react";
import { apiGet } from "@/lib/api";
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

export function TicketPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["user", "ticket", "fetch"],
    queryFn: () => apiGet<Ticket[]>("/user/ticket/fetch")
  });

  return (
    <>
      <PageHeader
        title="我的工单"
        actions={
          <Button onPress={() => navigate("/ticket/new")}>
            <Plus className="size-4" />
            新建工单
          </Button>
        }
      />
      <Card>
        <Card.Content className="p-0">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data || data.length === 0 ? (
            <EmptyState title="暂无工单" />
          ) : (
            <Table className="dense-table">
              <Table.ScrollContainer>
                <Table.Content aria-label="工单列表">
                  <Table.Header>
                    <Table.Column isRowHeader>标题</Table.Column>
                    <Table.Column>级别</Table.Column>
                    <Table.Column>状态</Table.Column>
                    <Table.Column>最后更新</Table.Column>
                  </Table.Header>
                  <Table.Body>
                    {data.map((t) => {
                      const s = STATUS[t.status] ?? STATUS[0]!;
                      const l = LEVEL[t.level] ?? LEVEL[0]!;
                      return (
                        <Table.Row key={t.id}>
                          <Table.Cell>
                            <Link to={`/ticket/${t.id}`} className="text-primary hover:underline">
                              {t.subject}
                            </Link>
                          </Table.Cell>
                          <Table.Cell>
                            <Chip variant="default" color={l.color}>{l.label}</Chip>
                          </Table.Cell>
                          <Table.Cell>
                            <Chip variant="default" color={s.color}>{s.label}</Chip>
                          </Table.Cell>
                          <Table.Cell>{formatUnix(t.updated_at)}</Table.Cell>
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
