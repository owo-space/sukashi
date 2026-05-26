import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { NodeStatusDot } from "@/components/admin/NodeStatusDot";
import { ProtocolChip } from "@/components/admin/ProtocolChip";
import { apiGet } from "@/lib/api";
import type { Protocol } from "@/components/admin/protocols";

interface UserNode {
  id: number;
  name: string;
  protocol?: Protocol;
  rate?: string | number;
  tags?: string[];
  is_online?: number | boolean;
  available_status?: number | null;
}

export function UserNodePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user.server.fetch"],
    queryFn: () => apiGet<UserNode[]>("/user/server/fetch"),
    refetchInterval: 30_000
  });

  return (
    <Card className="rounded border-slate-200">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="text-slate-500">节点</TableHead>
              <TableHead className="text-slate-500">协议</TableHead>
              <TableHead className="text-slate-500">状态</TableHead>
              <TableHead className="text-slate-500">倍率</TableHead>
              <TableHead className="text-slate-500">标签</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              data.map((n) => (
                <TableRow key={n.id} className="border-b border-slate-100">
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell>
                    <ProtocolChip protocol={n.protocol ?? "shadowsocks"} />
                  </TableCell>
                  <TableCell>
                    <NodeStatusDot
                      availableStatus={n.available_status ?? null}
                      isOnline={n.is_online ?? null}
                    />
                  </TableCell>
                  <TableCell className="text-slate-600">
                    <span className="inline-flex items-center rounded border border-slate-200 px-2 py-0.5 text-xs">
                      {n.rate ?? 1} x
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    {(n.tags ?? []).map((t) => (
                      <span
                        key={t}
                        className="mr-1 inline-flex items-center rounded border border-slate-200 px-2 py-0.5 text-slate-600"
                      >
                        {t}
                      </span>
                    ))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
