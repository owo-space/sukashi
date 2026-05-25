import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, Skeleton } from "@heroui/react";
import { apiGet } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import type { KnowledgeItem } from "@/lib/types";

export function KnowledgePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user", "knowledge", "fetch"],
    queryFn: () => apiGet<KnowledgeItem[]>("/user/knowledge/fetch")
  });

  if (isLoading) return <Skeleton className="h-72 w-full rounded-xl" />;
  if (!data || data.length === 0) {
    return (
      <>
        <PageHeader title="使用文档" />
        <EmptyState title="暂无文档" />
      </>
    );
  }

  const byCategory = data.reduce<Record<string, KnowledgeItem[]>>((acc, item) => {
    const key = item.category || "默认";
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="使用文档" description="客户端配置、订阅链接使用方法等文档。" />
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(byCategory).map(([cat, items]) => (
          <Card key={cat}>
            <Card.Header>
              <Card.Title>{cat}</Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-1">
                {items.map((it) => (
                  <li key={it.id}>
                    <Link to={`/knowledge/${it.id}`} className="text-sm text-primary hover:underline">
                      {it.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card.Content>
          </Card>
        ))}
      </div>
    </>
  );
}
