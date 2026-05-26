import { Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  UserCircle,
  Megaphone,
  BookOpen,
  Activity,
  Wallet,
  TicketCheck,
  UserPlus
} from "lucide-react";
import { Sidebar, type SidebarSection } from "./Sidebar";
import { HeaderBar } from "./HeaderBar";

const sections: SidebarSection[] = [
  {
    items: [
      { to: "/dashboard", label: "我的", icon: LayoutDashboard },
      { to: "/plan", label: "订阅购买", icon: Package },
      { to: "/order", label: "订单查询", icon: ShoppingBag }
    ]
  },
  {
    label: "用户中心",
    items: [
      { to: "/profile", label: "个人中心", icon: UserCircle },
      { to: "/invite", label: "邀请返佣", icon: UserPlus },
      { to: "/wallet", label: "钱包", icon: Wallet }
    ]
  },
  {
    label: "工单",
    items: [
      { to: "/ticket", label: "工单系统", icon: TicketCheck },
      { to: "/notice", label: "公告", icon: Megaphone },
      { to: "/knowledge", label: "知识库", icon: BookOpen }
    ]
  },
  {
    label: "其他",
    items: [{ to: "/traffic", label: "流量明细", icon: Activity }]
  }
];

const TITLES: Record<string, string> = {
  "/dashboard": "我的",
  "/plan": "订阅购买",
  "/order": "订单查询",
  "/profile": "个人中心",
  "/invite": "邀请返佣",
  "/wallet": "钱包",
  "/ticket": "工单系统",
  "/notice": "公告",
  "/knowledge": "知识库",
  "/traffic": "流量明细"
};

function titleFor(pathname: string): string {
  for (const key of Object.keys(TITLES)) {
    if (pathname === key || pathname.startsWith(`${key}/`)) return TITLES[key]!;
  }
  return "面板";
}

export function UserLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen bg-[#f0f2f5]">
      <Sidebar
        title="透かし"
        version={`透かし v${import.meta.env.VITE_PANEL_VERSION ?? "1.7.6"}`}
        sections={sections}
      />
      <div className="flex flex-1 flex-col">
        <HeaderBar title={titleFor(pathname)} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
