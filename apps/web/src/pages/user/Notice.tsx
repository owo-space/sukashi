import { useQuery } from "@tanstack/react-query";
import { Card, List, Skeleton } from "antd";
import dayjs from "dayjs";
import { apiGet } from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import type { Notice } from "@/lib/types";

export function NoticePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["user", "notice", "fetch"],
    queryFn: () => apiGet<Notice[]>("/user/notice/fetch")
  });

  if (isLoading) return <Skeleton active />;
  if (!data || data.length === 0) return <EmptyState title="暂无公告" />;

  return (
    <Card title="公告" size="small">
      <List
        dataSource={data}
        renderItem={(n) => (
          <List.Item style={{ display: "block" }}>
            <div style={{ fontWeight: 500 }}>{n.title}</div>
            <div style={{ color: "rgba(0,0,0,0.45)", fontSize: 12 }}>
              {dayjs.unix(n.created_at).format("YYYY-MM-DD HH:mm")}
            </div>
            <div
              style={{ marginTop: 8 }}
              dangerouslySetInnerHTML={{ __html: n.content }}
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
