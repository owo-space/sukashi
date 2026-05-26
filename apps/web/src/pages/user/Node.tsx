import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { apiGet } from "@/lib/api";
import type { ServerNode } from "@/lib/types";

export function UserNodePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user.server.fetch"],
    queryFn: () => apiGet<ServerNode[]>("/user/server/fetch"),
    refetchInterval: 30_000
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data || data.length === 0)
    return (
      <Card>
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    );

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {data.map((n) => (
        <Card key={`${n.type}-${n.id}`}>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{n.name}</span>
              <Badge variant={n.is_online ? "default" : "outline"}>
                {n.is_online ? "在线" : "离线"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-1">
            <div>协议: {n.type}</div>
            <div>倍率: {n.rate ?? 1}x</div>
            {n.tags && n.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {n.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
