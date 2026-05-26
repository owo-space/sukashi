import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { apiGet } from "@/lib/api";
import type { KnowledgeItem } from "@/lib/types";

export function UserKnowledgePage() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["user.knowledge.fetch"],
    queryFn: () => apiGet<KnowledgeItem[]>("/user/knowledge/fetch")
  });

  const q = query.trim().toLowerCase();
  const filtered = (data ?? []).filter((k) =>
    q ? k.title.toLowerCase().includes(q) || (k.body ?? "").toLowerCase().includes(q) : true
  );

  const groups = new Map<string, KnowledgeItem[]>();
  for (const item of filtered) {
    const cat = item.category ?? "其他";
    const arr = groups.get(cat) ?? [];
    arr.push(item);
    groups.set(cat, arr);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded border-slate-200">
        <CardContent className="flex items-center gap-2 p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索文档"
            className="h-9 flex-1"
          />
          <Button size="icon" className="size-9">
            <Search className="size-4" />
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? null : (
        Array.from(groups.entries()).map(([cat, items]) => (
          <Card key={cat} className="rounded border-slate-200">
            <CardContent className="py-3">
              <div className="mb-2 inline-flex items-center rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600">
                {cat}
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {items.map((k) => (
                  <Link
                    key={k.id}
                    to={`/knowledge/${k.id}`}
                    className="py-2.5 text-sm text-slate-700 hover:text-primary"
                  >
                    {k.title}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
