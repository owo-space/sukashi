import { Link } from "react-router-dom";
import { BookOpen, Rss, Clock, LifeBuoy, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { UserInfo } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBytes } from "@/lib/format";

const SHORTCUTS = [
  {
    title: "查看教程",
    desc: "学习如何使用 透かし",
    icon: BookOpen,
    to: "/knowledge"
  },
  {
    title: "一键订阅",
    desc: "快速将节点导入对应客户端进行使用",
    icon: Rss,
    to: "/dashboard?import=1"
  },
  {
    title: "续费订阅",
    desc: "对您当前的订阅进行续费",
    icon: Clock,
    to: "/plan"
  },
  {
    title: "遇到问题",
    desc: "遇到问题可以通过工单与我们沟通",
    icon: LifeBuoy,
    to: "/ticket"
  }
];

export function UserDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user.info"],
    queryFn: () => apiGet<UserInfo>("/user/info"),
    staleTime: 30_000
  });

  const used = (data?.u ?? 0) + (data?.d ?? 0);
  const total = data?.transfer_enable ?? 0;
  const percent = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const expireText =
    data?.expired_at === null || data?.expired_at === undefined
      ? "—"
      : data.expired_at === 0
        ? "该订阅长期有效"
        : `到期时间 ${new Date(data.expired_at * 1000).toISOString().slice(0, 10)}`;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">我的订阅</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : data?.plan ? (
            <>
              <div className="text-2xl font-medium">{data.plan.name}</div>
              <div className="text-sm text-muted-foreground">{expireText}</div>
              <Progress value={percent} className="h-1.5" />
              <div className="text-sm">
                已用 <span className="font-medium">{formatBytes(used)}</span> / 总计{" "}
                <span className="font-medium">{formatBytes(total)}</span>
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
          {SHORTCUTS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.to}
                to={s.to}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-accent/40 -mx-2 px-2 rounded transition-colors"
              >
                <Icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground">{s.desc}</div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
