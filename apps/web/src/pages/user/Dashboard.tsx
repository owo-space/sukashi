import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, ProgressBar, Skeleton } from "@heroui/react";
import { Activity, Bell, ShoppingCart, Ticket as TicketIcon } from "lucide-react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Snippet } from "@/components/Snippet";
import { formatBytes, formatExpiry, bytesToGB } from "@/lib/format";
import type { UserInfo, Notice } from "@/lib/types";

export function DashboardPage() {
  const { data: info, isLoading: loadingInfo } = useQuery({
    queryKey: ["user", "getSubscribe"],
    queryFn: () => apiGet<UserInfo>("/user/getSubscribe")
  });
  const { data: stat } = useQuery({
    queryKey: ["user", "getStat"],
    queryFn: () => apiGet<number[]>("/user/getStat")
  });
  const { data: notices } = useQuery({
    queryKey: ["user", "notice", "fetch"],
    queryFn: () => apiGet<Notice[]>("/user/notice/fetch")
  });

  const used = Number(info?.u ?? 0) + Number(info?.d ?? 0);
  const total = Number(info?.transfer_enable ?? 0);
  const usedPct = total > 0 ? Math.min(100, (used / total) * 100) : 0;

  return (
    <>
      <PageHeader title="仪表盘" description="查看你的订阅状态、流量使用情况以及最新公告。" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <Card.Header>
            <Card.Title>当前订阅</Card.Title>
          </Card.Header>
          <Card.Content>
            {loadingInfo ? (
              <Skeleton className="h-20 w-full rounded-md" />
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-semibold">
                  {info?.plan_name ?? "暂未订阅"}
                </div>
                <div className="text-sm text-muted">
                  到期时间：{formatExpiry(info?.expired_at ?? null)}
                </div>
                <Button as={Link} {...{ to: "/plan" }} size="sm" variant="secondary">
                  查看可用订阅
                </Button>
              </div>
            )}
          </Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title>流量使用</Card.Title>
          </Card.Header>
          <Card.Content>
            {loadingInfo ? (
              <Skeleton className="h-20 w-full rounded-md" />
            ) : (
              <>
                <ProgressBar value={usedPct} className="mb-2" aria-label="traffic usage" />
                <div className="text-sm text-muted">
                  {formatBytes(used)} / {formatBytes(total)} ({bytesToGB(total).toFixed(1)} GB)
                </div>
              </>
            )}
          </Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title>账户状态</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat icon={<ShoppingCart className="size-5" />} label="未支付" value={stat?.[0] ?? 0} />
              <Stat icon={<TicketIcon className="size-5" />} label="待回复" value={stat?.[1] ?? 0} />
              <Stat icon={<Activity className="size-5" />} label="邀请" value={stat?.[2] ?? 0} />
            </div>
          </Card.Content>
        </Card>
      </div>

      <Card className="mt-4">
        <Card.Header>
          <Card.Title>订阅链接</Card.Title>
          <Card.Description>把下面的链接复制到 Clash/Shadowrocket/SingBox 等客户端导入。</Card.Description>
        </Card.Header>
        <Card.Content>
          {info?.subscribe_url ? (
            <Snippet className="w-full">{info.subscribe_url}</Snippet>
          ) : (
            <Skeleton className="h-10 w-full" />
          )}
        </Card.Content>
      </Card>

      {notices && notices.length > 0 ? (
        <Card className="mt-4">
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Bell className="size-4" /> 最新公告
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <ul className="divide-y divide-default-200">
              {notices.slice(0, 5).map((n) => (
                <li key={n.id} className="py-2">
                  <div className="font-medium">{n.title}</div>
                  <div
                    className="prose prose-sm mt-1 max-w-none text-sm text-muted"
                    dangerouslySetInnerHTML={{ __html: n.content }}
                  />
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>
      ) : null}
    </>
  );
}

function Stat({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md bg-default-100 py-2">
      <div className="text-default-500">{icon}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
