import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, List, Skeleton } from "antd";
import { apiGet } from "@/lib/api";
import type { KnowledgeItem } from "@/lib/types";

export function KnowledgePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user", "knowledge", "fetch"],
    queryFn: () => apiGet<KnowledgeItem[]>("/user/knowledge/fetch")
  });

  if (isLoading) return <Skeleton active />;
  const byCat = new Map<string, KnowledgeItem[]>();
  for (const k of data ?? []) {
    const list = byCat.get(k.category) ?? [];
    list.push(k);
    byCat.set(k.category, list);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {[...byCat.entries()].map(([cat, items]) => (
        <Card key={cat} title={cat} size="small">
          <List
            dataSource={items}
            renderItem={(k) => (
              <List.Item>
                <Link to={`/knowledge/${k.id}`}>{k.title}</Link>
              </List.Item>
            )}
          />
        </Card>
      ))}
    </div>
  );
}
