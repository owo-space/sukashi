import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { apiGet } from "@/lib/api";

const PROTOCOL_LABEL: Record<string, string> = {
  shadowsocks: "Shadowsocks",
  vless: "VLESS",
  vmess: "VMess",
  trojan: "Trojan",
  hysteria2: "Hysteria2",
  tuic: "TUIC",
  anytls: "AnyTLS",
  mieru: "Mieru",
  snell: "Snell"
};

interface UserNode {
  id: number;
  name: string;
  protocol?: string;
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
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>协议</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>倍率</TableHead>
              <TableHead>标签</TableHead>
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
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {PROTOCOL_LABEL[n.protocol ?? ""] ?? n.protocol ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <NodeStatusDot
                      availableStatus={n.available_status ?? null}
                      isOnline={n.is_online ?? null}
                    />
                  </TableCell>
                  <TableCell>{n.rate ?? 1}x</TableCell>
                  <TableCell className="text-xs">
                    {(n.tags ?? []).map((t) => (
                      <Badge key={t} variant="outline" className="mr-1">
                        {t}
                      </Badge>
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
