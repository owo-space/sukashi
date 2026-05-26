import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  AppstoreOutlined,
  BookOutlined,
  ContainerOutlined,
  DashboardOutlined,
  LineChartOutlined,
  NotificationOutlined,
  ShoppingOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Layout, Menu } from "antd";
import { HeaderActions } from "@/components/HeaderActions";

const { Header, Sider, Content } = Layout;

interface Item {
  key: string;
  icon: React.ReactNode;
  label: string;
  group?: string;
}

const NAV: Item[] = [
  { key: "/dashboard", icon: <DashboardOutlined />, label: "仪表盘" },
  { key: "/knowledge", icon: <BookOutlined />, label: "使用文档" },
  { key: "/plan", icon: <ShoppingOutlined />, label: "购买订阅", group: "订阅" },
  { key: "/notice", icon: <NotificationOutlined />, label: "节点状态", group: "订阅" },
  { key: "/order", icon: <ContainerOutlined />, label: "我的订单", group: "财务" },
  { key: "/invite", icon: <AppstoreOutlined />, label: "我的邀请", group: "财务" },
  { key: "/profile", icon: <UserOutlined />, label: "个人中心", group: "用户" },
  { key: "/ticket", icon: <ContainerOutlined />, label: "我的工单", group: "用户" },
  { key: "/traffic", icon: <LineChartOutlined />, label: "流量明细", group: "用户" }
];

function buildMenu() {
  const groups = new Map<string | undefined, Item[]>();
  for (const it of NAV) {
    const list = groups.get(it.group) ?? [];
    list.push(it);
    groups.set(it.group, list);
  }
  const items: NonNullable<React.ComponentProps<typeof Menu>["items"]> = [];
  for (const [group, list] of groups.entries()) {
    if (!group) {
      for (const it of list) {
        items.push({
          key: it.key,
          icon: it.icon,
          label: <Link to={it.key}>{it.label}</Link>
        });
      }
    } else {
      items.push({ type: "group", key: `g-${group}`, label: group });
      for (const it of list) {
        items.push({
          key: it.key,
          icon: it.icon,
          label: <Link to={it.key}>{it.label}</Link>
        });
      }
    }
  }
  return items;
}

export function UserLayout() {
  const location = useLocation();
  const items = useMemo(() => buildMenu(), []);
  const selected = useMemo(() => {
    const match = NAV.find((n) => location.pathname.startsWith(n.key));
    return match ? [match.key] : [];
  }, [location.pathname]);
  const title =
    NAV.find((n) => location.pathname.startsWith(n.key))?.label ?? "仪表盘";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={225}
        breakpoint="lg"
        collapsedWidth={0}
        theme="dark"
        style={{ background: "#001529" }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 20,
            fontWeight: 500,
            background: "#3b5998"
          }}
        >
          透かし
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selected}
          items={items}
          style={{ background: "#001529" }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 16,
            color: "rgba(255,255,255,0.45)",
            fontSize: 12
          }}
        >
          透かし v1.7.6
        </div>
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0"
          }}
        >
          <span style={{ fontSize: 16 }}>{title}</span>
          <HeaderActions variant="user" />
        </Header>
        <Content style={{ margin: 16, padding: 16, background: "#fff" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
