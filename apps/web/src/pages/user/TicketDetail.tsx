import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Skeleton, TextArea } from "@heroui/react";
import { apiGet, apiPost } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { formatUnix } from "@/lib/format";
import type { Ticket } from "@/lib/types";

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["user", "ticket", "detail", id],
    queryFn: () => apiGet<Ticket>(`/user/ticket/fetch?id=${id}`)
  });

  const reply = useMutation({
    mutationFn: () => apiPost("/user/ticket/reply", { id: Number(id), message }),
    onSuccess: () => {
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["user", "ticket", "detail", id] });
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "回复失败"
      );
    }
  });

  const close = useMutation({
    mutationFn: () => apiPost("/user/ticket/close", { id: Number(id) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user", "ticket", "detail", id] });
      void queryClient.invalidateQueries({ queryKey: ["user", "ticket", "fetch"] });
    }
  });

  if (isLoading || !ticket) return <Skeleton className="h-72 w-full rounded-xl" />;

  return (
    <>
      <PageHeader
        title={ticket.subject}
        description={`创建于 ${formatUnix(ticket.created_at)}`}
        actions={<Button variant="tertiary" onPress={() => navigate("/ticket")}>返回工单列表</Button>}
      />
      <Card>
        <Card.Content className="space-y-3">
          {(ticket.message ?? []).map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.is_me ? "ml-auto bg-primary text-primary-foreground" : "bg-default-100"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.message}</div>
              <div className={`mt-1 text-[10px] ${m.is_me ? "text-primary-foreground/70" : "text-muted"}`}>
                {formatUnix(m.created_at)}
              </div>
            </div>
          ))}
        </Card.Content>
      </Card>

      {ticket.status === 0 ? (
        <Card className="mt-4">
          <Card.Header>
            <Card.Title>回复</Card.Title>
          </Card.Header>
          <Card.Content className="space-y-2">
            {error ? <Alert variant="danger" title="发送失败">{error}</Alert> : null}
            <TextArea
              aria-label="回复内容"
              value={message}
              onChange={setMessage}
              placeholder="输入你的回复…"
              rows={4}
            />
            <div className="flex justify-between">
              <Button
                variant="danger-soft"
                onPress={() => close.mutate()}
                isPending={close.isPending}
              >
                关闭工单
              </Button>
              <Button
                onPress={() => reply.mutate()}
                isDisabled={!message.trim()}
                isPending={reply.isPending}
              >
                发送回复
              </Button>
            </div>
          </Card.Content>
        </Card>
      ) : (
        <Alert variant="default" className="mt-4">
          工单已关闭。
        </Alert>
      )}
    </>
  );
}
