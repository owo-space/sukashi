import { Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  SlidersHorizontal,
  CreditCard,
  Palette,
  Layers,
  ShieldCheck,
  Shuffle,
  ClipboardList,
  ListOrdered,
  TicketPercent,
  Gift,
  Users,
  Megaphone,
  TicketCheck,
  BookOpen
} from "lucide-react";
import { Sidebar, type SidebarSection } from "./Sidebar";
import { HeaderBar } from "./HeaderBar";
import { useTheme } from "@/lib/theme";

const sections: SidebarSection[] = [
  {
    items: [{ to: "/admin", end: true, label: "仪表盘", icon: LayoutDashboard }]
  },
  {
    label: "设置",
    items: [
      { to: "/admin/setting", label: "系统配置", icon: SlidersHorizontal },
      { to: "/admin/payment", label: "支付配置", icon: CreditCard },
      { to: "/admin/theme", label: "主题配置", icon: Palette }
    ]
  },
  {
    label: "服务器",
    items: [
      { to: "/admin/server", label: "节点管理", icon: Layers },
      { to: "/admin/server-group", label: "权限组管理", icon: ShieldCheck },
      { to: "/admin/server-route", label: "路由管理", icon: Shuffle }
    ]
  },
  {
    label: "财务",
    items: [
      { to: "/admin/plan", label: "订阅管理", icon: ClipboardList },
      { to: "/admin/order", label: "订单管理", icon: ListOrdered },
      { to: "/admin/coupon", label: "优惠券管理", icon: TicketPercent },
      { to: "/admin/giftcard", label: "礼品卡管理", icon: Gift }
    ]
  },
  {
    label: "用户",
    items: [
      { to: "/admin/user", label: "用户管理", icon: Users },
      { to: "/admin/notice", label: "公告管理", icon: Megaphone },
      { to: "/admin/ticket", label: "工单管理", icon: TicketCheck },
      { to: "/admin/knowledge", label: "知识库管理", icon: BookOpen }
    ]
  }
];

const TITLES: Record<string, string> = {
  "/admin": "仪表盘",
  "/admin/setting": "系统配置",
  "/admin/payment": "支付配置",
  "/admin/theme": "主题配置",
  "/admin/server": "节点管理",
  "/admin/server-group": "权限组管理",
  "/admin/server-route": "路由管理",
  "/admin/plan": "订阅管理",
  "/admin/order": "订单管理",
  "/admin/coupon": "优惠券管理",
  "/admin/giftcard": "礼品卡管理",
  "/admin/user": "用户管理",
  "/admin/notice": "公告管理",
  "/admin/ticket": "工单管理",
  "/admin/knowledge": "知识库管理"
};

function titleFor(pathname: string): string {
  let best = "管理面板";
  let bestLen = -1;
  for (const key of Object.keys(TITLES)) {
    if ((pathname === key || pathname.startsWith(`${key}/`)) && key.length > bestLen) {
      best = TITLES[key]!;
      bestLen = key.length;
    }
  }
  return best;
}

export function AdminLayout() {
  const { pathname } = useLocation();
  const theme = useTheme();
  return (
    <div className="flex min-h-screen bg-[#f0f2f5]">
      <Sidebar
        title={theme.app_name}
        version={`${theme.app_name} v${import.meta.env.VITE_PANEL_VERSION ?? "1.7.6"}`}
        sections={sections}
      />
      <div className="flex flex-1 flex-col">
        <HeaderBar title={titleFor(pathname)} settingsHref="/admin/setting" />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
