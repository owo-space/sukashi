import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="rounded border-slate-200">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="text-slate-500">日期</TableHead>
              <TableHead className="text-slate-500">上传</TableHead>
              <TableHead className="text-slate-500">下载</TableHead>
              <TableHead className="text-slate-500">合计</TableHead>
              <TableHead className="text-slate-500">计算倍率</TableHead>
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
                <TableRow key={row.record_at} className="border-b border-slate-100">
                  <TableCell>{formatUnixDay(row.record_at)}</TableCell>
                  <TableCell className="text-slate-600">{formatBytes(row.u)}</TableCell>
                  <TableCell className="text-slate-600">{formatBytes(row.d)}</TableCell>
                  <TableCell className="text-slate-600">{formatBytes(row.u + row.d)}</TableCell>
                  <TableCell className="text-slate-600">{row.server_rate} x</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
