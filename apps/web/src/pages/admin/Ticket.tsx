import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { EmptyState } from "@/components/EmptyState";
import { RowActions } from "@/components/admin/RowActions";
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
    <Card className="rounded">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground">ID</TableHead>
              <TableHead className="text-muted-foreground">用户</TableHead>
              <TableHead className="text-muted-foreground">主题</TableHead>
              <TableHead className="text-muted-foreground">级别</TableHead>
              <TableHead className="text-muted-foreground">状态</TableHead>
              <TableHead className="text-muted-foreground">创建时间</TableHead>
              <TableHead className="text-muted-foreground">最后回复</TableHead>
              <TableHead className="text-right text-muted-foreground">操作</TableHead>
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
                <TableRow key={t.id} className="border-b border-border">
                  <TableCell className="text-foreground/80">{t.id}</TableCell>
                  <TableCell className="text-foreground/80">{t.user?.email ?? `#${t.user_id}`}</TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell className="text-foreground/80">{LEVEL_LABEL[t.level]}</TableCell>
                  <TableCell>
                    {t.status === 0 ? (
                      <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-600">
                        {t.reply_status ? "待回复" : "已开启"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                        已关闭
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatUnixDate(t.created_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatUnixDate(t.updated_at)}</TableCell>
                  <TableCell className="text-right">
                    <RowActions>
                      {t.status === 0 ? (
                        <DropdownMenuItem onClick={() => close.mutate(t.id)}>关闭工单</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem disabled>已关闭</DropdownMenuItem>
                      )}
                    </RowActions>
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
