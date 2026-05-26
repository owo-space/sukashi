import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { apiGet } from "@/lib/api";
import { formatUnixDate } from "@/lib/format";
import type { NoticeItem } from "@/lib/types";

export function UserNoticePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user.notice.fetch"],
    queryFn: () => apiGet<NoticeItem[]>("/user/notice/fetch")
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
    <div className="flex flex-col gap-4">
      {data.map((n) => (
        <Card key={n.id}>
          <CardHeader>
            <CardTitle className="text-base font-medium">{n.title}</CardTitle>
            <div className="text-xs text-muted-foreground">{formatUnixDate(n.created_at)}</div>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: n.content }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
