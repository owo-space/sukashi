import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { apiGet } from "@/lib/api";
import { formatBytes, formatUnixDay } from "@/lib/format";

interface TrafficStat {
  record_at: number;
  u: number;
  d: number;
  server_rate: string | number;
}

export function UserTrafficPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user.stat.getTrafficLog"],
    queryFn: () => apiGet<TrafficStat[]>("/user/stat/getTrafficLog")
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">流量明细</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>上传</TableHead>
              <TableHead>下载</TableHead>
              <TableHead>合计</TableHead>
              <TableHead>计算倍率</TableHead>
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
              data.map((row) => (
                <TableRow key={row.record_at}>
                  <TableCell>{formatUnixDay(row.record_at)}</TableCell>
                  <TableCell>{formatBytes(row.u)}</TableCell>
                  <TableCell>{formatBytes(row.d)}</TableCell>
                  <TableCell>{formatBytes(row.u + row.d)}</TableCell>
                  <TableCell>{row.server_rate}x</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
