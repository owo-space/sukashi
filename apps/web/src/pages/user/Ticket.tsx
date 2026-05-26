import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { apiGet } from "@/lib/api";
import { formatUnixDate } from "@/lib/format";
import type { Ticket } from "@/lib/types";

const LEVEL_LABEL: Record<number, string> = { 0: "低", 1: "中", 2: "高" };

export function UserTicketPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user.ticket.fetch"],
    queryFn: () => apiGet<Ticket[]>("/user/ticket/fetch")
  });

  return (
    <Card className="rounded border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 py-3">
        <CardTitle className="text-sm font-medium text-slate-700">工单历史</CardTitle>
        <Button asChild size="sm">
          <Link to="/ticket/new">新的工单</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              <TableHead className="w-12 text-slate-500">#</TableHead>
              <TableHead className="text-slate-500">主题</TableHead>
              <TableHead className="text-slate-500">工单级别</TableHead>
              <TableHead className="text-slate-500">工单状态</TableHead>
              <TableHead className="text-slate-500">创建时间</TableHead>
              <TableHead className="text-slate-500">最后回复</TableHead>
              <TableHead className="text-right text-slate-500">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              data.map((t, i) => (
                <TableRow key={t.id} className="border-b border-slate-100">
                  <TableCell className="text-slate-600">{i + 1}</TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell className="text-slate-600">{LEVEL_LABEL[t.level] ?? t.level}</TableCell>
                  <TableCell>
                    {t.status === 0 ? (
                      <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">
                        已开启
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                        已关闭
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{formatUnixDate(t.created_at)}</TableCell>
                  <TableCell className="text-xs text-slate-500">{formatUnixDate(t.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    <Link to={`/ticket/${t.id}`} className="text-primary hover:underline text-sm">
                      查看
                    </Link>
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
