import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Gauge,
  Users,
  Box,
  Server,
  Receipt,
  CreditCard,
  Ticket,
  BookOpen,
  Bell,
  Gift,
  Tag,
  Settings,
  LogOut,
  Menu
} from "lucide-react";
import { Avatar, Button, Dropdown } from "@heroui/react";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

interface Item {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: Item[] = [
  { to: "/admin/dashboard", label: "概览", icon: Gauge },
  { to: "/admin/user", label: "用户", icon: Users },
  { to: "/admin/plan", label: "订阅", icon: Box },
  { to: "/admin/server", label: "节点", icon: Server },
  { to: "/admin/order", label: "订单", icon: Receipt },
  { to: "/admin/payment", label: "支付", icon: CreditCard },
  { to: "/admin/coupon", label: "优惠券", icon: Tag },
  { to: "/admin/giftcard", label: "礼品卡", icon: Gift },
  { to: "/admin/ticket", label: "工单", icon: Ticket },
  { to: "/admin/knowledge", label: "知识库", icon: BookOpen },
  { to: "/admin/notice", label: "公告", icon: Bell },
  { to: "/admin/setting", label: "系统设置", icon: Settings }
];

export function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-full bg-default-50">
      <aside
        className={`${
          open ? "block" : "hidden"
        } fixed inset-y-0 left-0 z-40 w-60 border-r border-default-200 bg-foreground text-background md:static md:block`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-default-800/40 px-4">
          <img alt="logo" className="size-7" src="/favicon.svg" />
          <span className="text-base font-semibold">透かし · 管理后台</span>
        </div>
        <nav className="flex flex-col gap-0.5 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-background/80 hover:bg-default-800/40 hover:text-background"
                  }`
                }
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <NavLink
            to="/dashboard"
            className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-default-700 px-3 py-2 text-sm text-background/70 hover:bg-default-800/40"
          >
            ← 返回用户端
          </NavLink>
        </nav>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-default-200 bg-background/95 px-4 backdrop-blur md:px-6">
          <Button
            isIconOnly
            size="sm"
            variant="ghost"
            onPress={() => setOpen((v) => !v)}
            className="md:hidden"
            aria-label="toggle nav"
          >
            <Menu className="size-4" />
          </Button>
          <div className="flex-1" />
          <Dropdown>
            <Dropdown.Trigger>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-2 py-1 text-sm hover:bg-default-100"
              >
                <Avatar size="sm" />
                <span className="hidden sm:inline">管理员</span>
              </button>
            </Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu>
                <Dropdown.Item
                  onAction={() => {
                    logout();
                    navigate("/login", { replace: true });
                  }}
                >
                  <LogOut className="size-4" />
                  退出登录
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
