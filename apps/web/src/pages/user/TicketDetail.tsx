import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Input, Skeleton, Space } from "antd";
import dayjs from "dayjs";
import { apiGet, apiPost } from "@/lib/api";
import type { Ticket } from "@/lib/types";

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["user", "ticket", id],
    queryFn: () => apiGet<Ticket>(`/user/ticket/fetch?id=${id}`)
  });
  const sendReply = useMutation({
    mutationFn: () => apiPost("/user/ticket/reply", { id: Number(id), message: reply }),
    onSuccess: () => {
      setReply("");
      void qc.invalidateQueries({ queryKey: ["user", "ticket", id] });
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "回复失败"
      );
    }
  });
  const close = useMutation({
    mutationFn: () => apiPost("/user/ticket/close", { id: Number(id) }),
    onSuccess: () => navigate("/ticket")
  });

  if (isLoading || !ticket) return <Skeleton active />;

  return (
    <Card title={ticket.subject} size="small" extra={
      <Button danger loading={close.isPending} onClick={() => close.mutate()}>
        关闭工单
      </Button>
    }>
      {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        {(ticket.message ?? []).map((m) => (
          <div
            key={m.id}
            style={{
              background: m.is_me ? "#e6f4ff" : "#fafafa",
              padding: 12,
              borderRadius: 4
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{m.message}</div>
            <div style={{ marginTop: 4, fontSize: 12, color: "rgba(0,0,0,0.45)" }}>
              {dayjs.unix(m.created_at).format("YYYY-MM-DD HH:mm")}
            </div>
          </div>
        ))}
        {ticket.status !== 2 ? (
          <>
            <Input.TextArea
              rows={4}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="输入回复内容"
            />
            <Button
              type="primary"
              loading={sendReply.isPending}
              disabled={!reply.trim()}
              onClick={() => {
                setError(null);
                sendReply.mutate();
              }}
            >
              发送回复
            </Button>
          </>
        ) : null}
      </Space>
    </Card>
  );
}
