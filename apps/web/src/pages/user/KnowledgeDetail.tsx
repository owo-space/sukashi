import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Skeleton } from "antd";
import { apiGet } from "@/lib/api";
import type { KnowledgeItem } from "@/lib/types";

export function KnowledgeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["user", "knowledge", id],
    queryFn: () => apiGet<KnowledgeItem>(`/user/knowledge/fetch?id=${id}`)
  });

  if (isLoading || !data) return <Skeleton active />;

  return (
    <Card
      title={data.title}
      size="small"
      extra={<Button onClick={() => navigate("/knowledge")}>返回</Button>}
    >
      <div dangerouslySetInnerHTML={{ __html: data.body }} />
    </Card>
  );
}
