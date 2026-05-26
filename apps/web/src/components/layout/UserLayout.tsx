import { Outlet, useLocation } from "react-router-dom";
import {
  Gauge,
  BookOpen,
  ShoppingBag,
  CheckCircle2,
  ListOrdered,
  UserPlus,
  UserCircle,
  MessagesSquare,
  BarChart3
} from "lucide-react";
import { Sidebar, type SidebarSection } from "./Sidebar";
import { HeaderBar } from "./HeaderBar";
import { useTheme } from "@/lib/theme";

const sections: SidebarSection[] = [
  {
    items: [
      { to: "/dashboard", label: "仪表盘", icon: Gauge },
      { to: "/knowledge", label: "使用文档", icon: BookOpen }
    ]
  },
  {
    label: "订阅",
    items: [
      { to: "/plan", label: "购买订阅", icon: ShoppingBag },
      { to: "/node", label: "节点状态", icon: CheckCircle2 }
    ]
  },
  {
    label: "财务",
    items: [
      { to: "/order", label: "我的订单", icon: ListOrdered },
      { to: "/invite", label: "我的邀请", icon: UserPlus }
    ]
  },
  {
    label: "用户",
    items: [
      { to: "/profile", label: "个人中心", icon: UserCircle },
      { to: "/ticket", label: "我的工单", icon: MessagesSquare },
      { to: "/traffic", label: "流量明细", icon: BarChart3 }
    ]
  }
];

const TITLES: Record<string, string> = {
  "/dashboard": "仪表盘",
  "/knowledge": "使用文档",
  "/plan": "购买订阅",
  "/node": "节点状态",
  "/order": "我的订单",
  "/invite": "我的邀请",
  "/profile": "个人中心",
  "/ticket": "我的工单",
  "/traffic": "流量明细",
  "/notice": "公告"
};

function titleFor(pathname: string): string {
  let best = "面板";
  let bestLen = -1;
  for (const key of Object.keys(TITLES)) {
    if ((pathname === key || pathname.startsWith(`${key}/`)) && key.length > bestLen) {
      best = TITLES[key]!;
      bestLen = key.length;
    }
  }
  return best;
}

export function UserLayout() {
  const { pathname } = useLocation();
  const theme = useTheme();
  const hasBg = Boolean(theme.frontend_background_url);
  return (
    <div
      className={`flex min-h-screen ${hasBg ? "" : "bg-[#f0f2f5]"}`}
      style={
        hasBg
          ? {
              backgroundImage: `url(${JSON.stringify(theme.frontend_background_url)})`,
              backgroundSize: "cover",
              backgroundAttachment: "fixed",
              backgroundPosition: "center"
            }
          : undefined
      }
    >
      <Sidebar
        title={theme.app_name}
        version={`${theme.app_name} v${import.meta.env.VITE_PANEL_VERSION ?? "1.7.6"}`}
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
