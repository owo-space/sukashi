import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Progress, Row, Skeleton, Typography } from "antd";
import {
  BookOutlined,
  ClockCircleOutlined,
  CustomerServiceOutlined,
  WifiOutlined
} from "@ant-design/icons";
import { apiGet } from "@/lib/api";
import { formatBytes, bytesToGB } from "@/lib/format";
import type { UserInfo, Notice } from "@/lib/types";

export function DashboardPage() {
  const { data: info, isLoading: loadingInfo } = useQuery({
    queryKey: ["user", "getSubscribe"],
    queryFn: () => apiGet<UserInfo>("/user/getSubscribe")
  });
  const { data: notices } = useQuery({
    queryKey: ["user", "notice", "fetch"],
    queryFn: () => apiGet<Notice[]>("/user/notice/fetch")
  });

  const used = Number(info?.u ?? 0) + Number(info?.d ?? 0);
  const total = Number(info?.transfer_enable ?? 0);
  const usedPct = total > 0 ? Math.min(100, (used / total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card title="我的订阅" size="small">
        {loadingInfo ? (
          <Skeleton active />
        ) : (
          <>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              {info?.plan_name ?? "暂未订阅"}
            </Typography.Title>
            <Typography.Text type="secondary">
              {info?.expired_at ? "该订阅按期付费" : "该订阅长期有效"}
            </Typography.Text>
            <Progress percent={usedPct} showInfo={false} style={{ marginTop: 12 }} />
            <Typography.Text>
              已用 {formatBytes(used)} / 总计 {bytesToGB(total).toFixed(2)} GB · 在线设备 0/∞
            </Typography.Text>
          </>
        )}
      </Card>
      <Card title="捷径" size="small">
        <Shortcut to="/knowledge" icon={<BookOutlined />} title="查看教程" desc="学习如何使用 透かし" />
        <Shortcut to="/plan" icon={<WifiOutlined />} title="一键订阅" desc="快速将节点导入对应客户端进行使用" />
        <Shortcut to="/plan" icon={<ClockCircleOutlined />} title="续费订阅" desc="对您当前的订阅进行续费" />
        <Shortcut to="/ticket" icon={<CustomerServiceOutlined />} title="遇到问题" desc="遇到问题可以通过工单与我们沟通" />
      </Card>
      {notices && notices.length > 0 ? (
        <Card title="最新公告" size="small">
          {notices.slice(0, 5).map((n) => (
            <div key={n.id} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
              <Typography.Text strong>{n.title}</Typography.Text>
              <div
                style={{ marginTop: 4, color: "rgba(0,0,0,0.55)" }}
                dangerouslySetInnerHTML={{ __html: n.content }}
              />
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}

function Shortcut({
  to,
  icon,
  title,
  desc
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 0",
        borderBottom: "1px solid #f0f0f0",
        color: "inherit"
      }}
    >
      <div>
        <div style={{ fontWeight: 500 }}>{title}</div>
        <div style={{ color: "rgba(0,0,0,0.45)", fontSize: 13 }}>{desc}</div>
      </div>
      <div style={{ fontSize: 24, color: "rgba(0,0,0,0.45)" }}>{icon}</div>
    </Link>
  );
}
