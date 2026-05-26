import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api";
import type { KnowledgeItem } from "@/lib/types";

export function UserKnowledgeDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["user.knowledge.detail", id],
    queryFn: () => apiGet<KnowledgeItem>("/user/knowledge/fetch", { params: { id } })
  });

  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{data.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: data.body ?? "" }}
        />
      </CardContent>
    </Card>
  );
}
