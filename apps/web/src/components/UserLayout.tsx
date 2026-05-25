import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  UserPlus,
  Ticket,
  BookOpen,
  Activity,
  User,
  LogOut,
  Bell,
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
  { to: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { to: "/plan", label: "购买订阅", icon: ShoppingCart },
  { to: "/order", label: "我的订单", icon: Receipt },
  { to: "/invite", label: "邀请佣金", icon: UserPlus },
  { to: "/ticket", label: "我的工单", icon: Ticket },
  { to: "/knowledge", label: "使用文档", icon: BookOpen },
  { to: "/notice", label: "公告", icon: Bell },
  { to: "/traffic", label: "流量明细", icon: Activity },
  { to: "/profile", label: "个人中心", icon: User }
];

export function UserLayout() {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-full bg-default-50">
      {/* Sidebar */}
      <aside
        className={`${
          open ? "block" : "hidden"
        } fixed inset-y-0 left-0 z-40 w-60 border-r border-default-200 bg-background md:static md:block`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-default-200 px-4">
          <img alt="logo" className="size-7" src="/favicon.svg" />
          <span className="text-base font-semibold">透かし</span>
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
                      : "text-foreground hover:bg-default-100"
                  }`
                }
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          {isAdmin ? (
            <NavLink
              to="/admin"
              className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-default-300 px-3 py-2 text-sm text-muted hover:bg-default-100"
            >
              进入管理后台 →
            </NavLink>
          ) : null}
        </nav>
      </aside>

      {/* Backdrop for mobile */}
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Content */}
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
                <span className="hidden sm:inline">账户</span>
              </button>
            </Dropdown.Trigger>
            <Dropdown.Popover>
              <Dropdown.Menu>
                <Dropdown.Item
                  onAction={() => {
                    navigate("/profile");
                  }}
                >
                  <User className="size-4" />
                  个人中心
                </Dropdown.Item>
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

// Expose a Link wrapper to silence "unused" warnings if not used elsewhere.
export { Link as RouterLink };
