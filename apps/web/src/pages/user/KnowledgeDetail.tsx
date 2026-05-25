import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Skeleton } from "@heroui/react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import type { KnowledgeItem } from "@/lib/types";

export function KnowledgeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["user", "knowledge", "fetch", id],
    queryFn: () => apiGet<KnowledgeItem[]>("/user/knowledge/fetch")
  });

  const item = data?.find((k) => String(k.id) === String(id));
  if (isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (!item) {
    return (
      <>
        <PageHeader title="文档" />
        <Card>
          <Card.Content>文档不存在</Card.Content>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={item.title}
        description={item.category}
        actions={<Button variant="tertiary" onPress={() => navigate("/knowledge")}>返回</Button>}
      />
      <Card>
        <Card.Content>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: item.body }}
          />
        </Card.Content>
      </Card>
    </>
  );
}
