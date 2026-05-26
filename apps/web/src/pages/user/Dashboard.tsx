import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Rss, Clock, LifeBuoy, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscribeModal } from "@/components/SubscribeModal";
import { formatBytes, formatUnixDate } from "@/lib/format";

interface Subscribe {
  plan?: { name: string; transfer_enable: number } | null;
  plan_id?: number | null;
  plan_name?: string | null;
  expired_at: number | null;
  reset_day?: number | null;
  subscribe_url: string;
  transfer_enable: number;
  u: number;
  d: number;
  device?: number;
  device_limit?: number | null;
}

export function UserDashboardPage() {
  const [subOpen, setSubOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["user.getSubscribe"],
    queryFn: () => apiGet<Subscribe>("/user/getSubscribe"),
    staleTime: 30_000
  });

  const used = (data?.u ?? 0) + (data?.d ?? 0);
  const total = data?.transfer_enable ?? 0;
  const percent = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const expireText =
    data?.expired_at == null
      ? "该订阅长期有效"
      : `到期时间 ${formatUnixDate(data.expired_at)}`;
  const planName = data?.plan?.name ?? data?.plan_name ?? null;

  const subscribeUrl = data?.subscribe_url ?? "";

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">我的订阅</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : planName ? (
              <>
                <div className="text-2xl font-medium">{planName}</div>
                <div className="text-sm text-muted-foreground">{expireText}</div>
                <Progress value={percent} className="h-1.5" />
                <div className="text-sm">
                  已用 <span className="font-medium">{formatBytes(used)}</span> / 总计{" "}
                  <span className="font-medium">{formatBytes(total)}</span>
                  <span className="ml-3 text-muted-foreground">
                    在线设备 {data?.device ?? 0}/{data?.device_limit ?? "∞"}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 py-2 text-sm text-muted-foreground">
                <div>当前没有订阅</div>
                <Link to="/plan" className="text-primary hover:underline">
                  立即选购 →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">捷径</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y">
            <Link
              to="/knowledge"
              className="flex items-center gap-3 py-3 first:pt-0 hover:bg-accent/40 -mx-2 px-2 rounded transition-colors"
            >
              <BookOpen className="size-5 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1">
                <div className="text-sm font-medium">查看教程</div>
                <div className="text-xs text-muted-foreground">学习如何使用 透かし</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            <button
              type="button"
              onClick={() => subscribeUrl && setSubOpen(true)}
              disabled={!subscribeUrl}
              className="flex items-center gap-3 py-3 hover:bg-accent/40 -mx-2 px-2 rounded transition-colors text-left disabled:opacity-50"
            >
              <Rss className="size-5 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1">
                <div className="text-sm font-medium">一键订阅</div>
                <div className="text-xs text-muted-foreground">快速将节点导入对应客户端进行使用</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </button>
            <Link
              to="/plan"
              className="flex items-center gap-3 py-3 hover:bg-accent/40 -mx-2 px-2 rounded transition-colors"
            >
              <Clock className="size-5 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1">
                <div className="text-sm font-medium">续费订阅</div>
                <div className="text-xs text-muted-foreground">对您当前的订阅进行续费</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
            <Link
              to="/ticket"
              className="flex items-center gap-3 py-3 last:pb-0 hover:bg-accent/40 -mx-2 px-2 rounded transition-colors"
            >
              <LifeBuoy className="size-5 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1">
                <div className="text-sm font-medium">遇到问题</div>
                <div className="text-xs text-muted-foreground">遇到问题可以通过工单与我们沟通</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <SubscribeModal open={subOpen} onOpenChange={setSubOpen} subscribeUrl={subscribeUrl} />
    </>
  );
}
