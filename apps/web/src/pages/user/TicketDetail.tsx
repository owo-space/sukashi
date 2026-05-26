import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatUnixDate } from "@/lib/format";

interface Message {
  id: number;
  user_id: number;
  message: string;
  created_at: number;
}
interface TicketDetail {
  id: number;
  subject: string;
  status: number;
  level: number;
  message: Message[];
  created_at: number;
  user_id?: number;
}

export function UserTicketDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["user.ticket.detail", id],
    queryFn: () => apiGet<TicketDetail>("/user/ticket/fetch", { params: { id } }),
    refetchInterval: 15_000
  });

  const sendReply = useMutation({
    mutationFn: () => apiPost("/user/ticket/reply", { id: Number(id), message: reply }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["user.ticket.detail", id] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : (err as Error).message)
  });

  const close = useMutation({
    mutationFn: () => apiPost("/user/ticket/close", { id: Number(id) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user.ticket.detail", id] })
  });

  if (isLoading || !data) return <Skeleton className="h-96 w-full" />;
  const closed = data.status === 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-medium">{data.subject}</CardTitle>
          <Badge variant={closed ? "outline" : "default"}>{closed ? "已关闭" : "已开启"}</Badge>
        </div>
        {!closed ? (
          <Button size="sm" variant="outline" onClick={() => close.mutate()}>
            关闭工单
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {data.message?.map((m) => (
          <div
            key={m.id}
            className={`rounded p-3 text-sm ${
              m.user_id === data.user_id ? "bg-primary/5 ml-12" : "bg-muted mr-12"
            }`}
          >
            <div className="mb-1 text-xs text-muted-foreground">{formatUnixDate(m.created_at)}</div>
            <div className="whitespace-pre-wrap">{m.message}</div>
          </div>
        ))}

        {!closed ? (
          <>
            <Separator />
            <Textarea
              rows={4}
              placeholder="回复内容"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <div>
              <Button onClick={() => sendReply.mutate()} disabled={!reply || sendReply.isPending}>
                发送
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
