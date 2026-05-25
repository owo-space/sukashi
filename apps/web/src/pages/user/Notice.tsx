import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton } from "@heroui/react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { formatUnix } from "@/lib/format";
import type { Notice } from "@/lib/types";

export function NoticePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user", "notice", "fetch"],
    queryFn: () => apiGet<Notice[]>("/user/notice/fetch")
  });

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <>
      <PageHeader title="公告" />
      {!data || data.length === 0 ? (
        <EmptyState title="暂无公告" />
      ) : (
        <div className="space-y-3">
          {data.map((n) => (
            <Card key={n.id}>
              <Card.Header>
                <Card.Title>{n.title}</Card.Title>
                <Card.Description>{formatUnix(n.created_at)}</Card.Description>
              </Card.Header>
              <Card.Content>
                {n.img_url ? (
                  <img src={n.img_url} alt="" className="mb-3 max-h-64 rounded-md" />
                ) : null}
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: n.content }}
                />
              </Card.Content>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
