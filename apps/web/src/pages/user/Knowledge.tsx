import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import type { KnowledgeItem } from "@/lib/types";

export function UserKnowledgePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user.knowledge.fetch"],
    queryFn: () => apiGet<KnowledgeItem[]>("/user/knowledge/fetch")
  });

  const groups = new Map<string, KnowledgeItem[]>();
  for (const item of data ?? []) {
    const cat = item.category ?? "其他";
    const arr = groups.get(cat) ?? [];
    arr.push(item);
    groups.set(cat, arr);
  }

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
      {Array.from(groups.entries()).map(([cat, items]) => (
        <Card key={cat}>
          <CardContent className="py-4">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">{cat}</Badge>
            </div>
            <div className="flex flex-col divide-y">
              {items.map((k) => (
                <Link
                  key={k.id}
                  to={`/knowledge/${k.id}`}
                  className="py-2 text-sm hover:text-primary"
                >
                  {k.title}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
