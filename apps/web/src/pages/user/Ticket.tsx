import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { formatUnixDate } from "@/lib/format";
import type { Ticket } from "@/lib/types";

const LEVEL_LABEL: Record<number, string> = { 0: "低", 1: "中", 2: "高" };
const STATUS_LABEL: Record<number, string> = { 0: "已开启", 1: "已关闭" };

export function UserTicketPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user.ticket.fetch"],
    queryFn: () => apiGet<Ticket[]>("/user/ticket/fetch")
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">工单历史</CardTitle>
        <Button asChild size="sm">
          <Link to="/ticket/new">新的工单</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>主题</TableHead>
              <TableHead>工单级别</TableHead>
              <TableHead>工单状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>最后回复</TableHead>
              <TableHead className="text-right">操作</TableHead>
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
                <TableRow key={t.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell>{LEVEL_LABEL[t.level] ?? t.level}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 0 ? "default" : "outline"}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatUnixDate(t.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatUnixDate(t.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/ticket/${t.id}`}>查看</Link>
                    </Button>
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
