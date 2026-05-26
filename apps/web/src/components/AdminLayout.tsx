import { useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  ApartmentOutlined,
  BookOutlined,
  ContainerOutlined,
  ControlOutlined,
  CreditCardOutlined,
  CustomerServiceOutlined,
  DashboardOutlined,
  GiftOutlined,
  NotificationOutlined,
  PartitionOutlined,
  ShoppingOutlined,
  SkinOutlined,
  TagsOutlined,
  TeamOutlined,
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
  { key: "/admin/dashboard", icon: <DashboardOutlined />, label: "仪表盘" },
  { key: "/admin/setting", icon: <ControlOutlined />, label: "系统配置", group: "设置" },
  { key: "/admin/payment", icon: <CreditCardOutlined />, label: "支付配置", group: "设置" },
  { key: "/admin/theme", icon: <SkinOutlined />, label: "主题配置", group: "设置" },
  { key: "/admin/server", icon: <ApartmentOutlined />, label: "节点管理", group: "服务器" },
  { key: "/admin/server/group", icon: <TeamOutlined />, label: "权限组管理", group: "服务器" },
  { key: "/admin/server/route", icon: <PartitionOutlined />, label: "路由管理", group: "服务器" },
  { key: "/admin/plan", icon: <ShoppingOutlined />, label: "订阅管理", group: "财务" },
  { key: "/admin/order", icon: <ContainerOutlined />, label: "订单管理", group: "财务" },
  { key: "/admin/coupon", icon: <TagsOutlined />, label: "优惠券管理", group: "财务" },
  { key: "/admin/giftcard", icon: <GiftOutlined />, label: "礼品卡管理", group: "财务" },
  { key: "/admin/user", icon: <UserOutlined />, label: "用户管理", group: "用户" },
  { key: "/admin/notice", icon: <NotificationOutlined />, label: "公告管理", group: "用户" },
  { key: "/admin/ticket", icon: <CustomerServiceOutlined />, label: "工单管理", group: "用户" },
  { key: "/admin/knowledge", icon: <BookOutlined />, label: "知识库管理", group: "用户" }
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

export function AdminLayout() {
  const location = useLocation();
  const items = useMemo(() => buildMenu(), []);
  const selected = useMemo(() => {
    // exact-match by longest prefix
    const match = NAV.slice()
      .sort((a, b) => b.key.length - a.key.length)
      .find((n) => location.pathname.startsWith(n.key));
    return match ? [match.key] : [];
  }, [location.pathname]);
  const title =
    NAV.slice()
      .sort((a, b) => b.key.length - a.key.length)
      .find((n) => location.pathname.startsWith(n.key))?.label ?? "管理后台";

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
          <HeaderActions variant="admin" />
        </Header>
        <Content style={{ margin: 16, padding: 16, background: "#fff" }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
