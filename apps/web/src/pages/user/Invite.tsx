import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, Col, Row, Skeleton, Statistic, Table } from "antd";
import dayjs from "dayjs";
import { apiGet, apiPost } from "@/lib/api";
import { Snippet } from "@/components/Snippet";
import { formatCents } from "@/lib/format";
import type { CommissionLog, InviteStat } from "@/lib/types";

export function InvitePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["user", "invite", "details"],
    queryFn: () => apiGet<InviteStat>("/user/invite/details")
  });
  const { data: logs } = useQuery({
    queryKey: ["user", "invite", "commissionLog"],
    queryFn: () => apiGet<CommissionLog[]>("/user/invite/commissionLog")
  });
  const create = useMutation({
    mutationFn: () => apiPost("/user/invite/save"),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["user", "invite"] })
  });

  if (isLoading || !data) return <Skeleton active />;
  const [activeCodes, invitedUsers, commissionCount, commissionTotal] = data.stat;

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small"><Statistic title="可用邀请码" value={activeCodes ?? 0} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="已邀请用户" value={invitedUsers ?? 0} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="佣金次数" value={commissionCount ?? 0} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="累计佣金" value={formatCents(commissionTotal ?? 0)} />
          </Card>
        </Col>
      </Row>
      <Card
        title="我的邀请码"
        size="small"
        style={{ marginTop: 16 }}
        extra={
          <Button type="primary" loading={create.isPending} onClick={() => create.mutate()}>
            生成新邀请码
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={data.codes}
          pagination={false}
          columns={[
            {
              title: "邀请链接",
              dataIndex: "code",
              render: (c: string) => (
                <Snippet>{`${window.location.origin}/#/register?code=${c}`}</Snippet>
              )
            },
            { title: "页面访问", dataIndex: "pv", width: 100 },
            {
              title: "状态",
              dataIndex: "status",
              width: 100,
              render: (s: number) => (s === 0 ? "可用" : "已用")
            }
          ]}
        />
      </Card>
      <Card title="佣金记录" size="small" style={{ marginTop: 16 }}>
        <Table<CommissionLog>
          rowKey="id"
          dataSource={logs ?? []}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: "订单", dataIndex: "trade_no" },
            { title: "订单金额", dataIndex: "order_amount", render: (v: number) => formatCents(v) },
            { title: "佣金", dataIndex: "get_amount", render: (v: number) => formatCents(v) },
            {
              title: "时间",
              dataIndex: "created_at",
              render: (t: number) => dayjs.unix(t).format("YYYY-MM-DD HH:mm")
            }
          ]}
        />
      </Card>
    </div>
  );
}
