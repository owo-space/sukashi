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
      <Card className="rounded border-slate-200">
        <CardContent>
          <EmptyState />
        </CardContent>
      </Card>
    );

  return (
    <div className="flex flex-col gap-4">
      {data.map((n) => (
        <Card key={n.id} className="rounded border-slate-200">
          <CardHeader className="border-b border-slate-100 py-3">
            <CardTitle className="text-sm font-medium text-slate-700">{n.title}</CardTitle>
            <div className="text-xs text-slate-500">{formatUnixDate(n.created_at)}</div>
          </CardHeader>
          <CardContent className="py-4">
            <div
              className="prose prose-sm max-w-none text-slate-700"
              dangerouslySetInnerHTML={{ __html: n.content }}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
