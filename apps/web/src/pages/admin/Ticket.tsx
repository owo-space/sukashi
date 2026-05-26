import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { formatUnixDate } from "@/lib/format";

interface AdminTicket {
  id: number;
  user_id: number;
  user?: { id: number; email: string };
  subject: string;
  level: number;
  status: number;
  reply_status: number;
  created_at: number;
  updated_at: number;
}

const LEVEL_LABEL: Record<number, string> = { 0: "低", 1: "中", 2: "高" };

export function AdminTicketPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin.ticket.fetch"],
    queryFn: () => apiGet<AdminTicket[]>("/admin/ticket/fetch")
  });

  const close = useMutation({
    mutationFn: (id: number) => apiPost("/admin/ticket/close", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin.ticket.fetch"] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message)
  });

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>主题</TableHead>
              <TableHead>级别</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead>最后回复</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            ) : (
              data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.id}</TableCell>
                  <TableCell>{t.user?.email ?? `#${t.user_id}`}</TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell>{LEVEL_LABEL[t.level]}</TableCell>
                  <TableCell>
                    <Badge variant={t.status === 0 ? "default" : "outline"}>
                      {t.status === 0 ? (t.reply_status ? "待回复" : "已开启") : "已关闭"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatUnixDate(t.created_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatUnixDate(t.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    {t.status === 0 ? (
                      <Button size="sm" variant="ghost" onClick={() => close.mutate(t.id)}>
                        关闭
                      </Button>
                    ) : null}
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
