import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings, User, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

interface ProfileInfo {
  email?: string;
  is_admin?: boolean | number;
}

export function HeaderBar({ title, settingsHref }: { title: string; settingsHref?: string }) {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["user.info"],
    queryFn: () => apiGet<ProfileInfo>("/user/info"),
    staleTime: 60_000
  });

  return (
    <header
      className="flex h-14 items-center justify-between bg-white border-b border-slate-200 px-6 [html[data-header=dark]_&]:border-transparent [html[data-header=dark]_&]:text-white [html[data-header=dark]_&]:[background:var(--brand-dark-bg)]"
    >
      <h1 className="text-[15px] text-slate-700 [html[data-header=dark]_&]:text-white">{title}</h1>
      <div className="flex items-center gap-4">
        {settingsHref ? (
          <Link
            to={settingsHref}
            className="text-slate-500 hover:text-slate-700 [html[data-header=dark]_&]:text-white/70 [html[data-header=dark]_&]:hover:text-white"
            aria-label="设置"
          >
            <Settings className="size-4" strokeWidth={1.75} />
          </Link>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-primary [html[data-header=dark]_&]:text-white/85 [html[data-header=dark]_&]:hover:text-white"
            >
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 [html[data-header=dark]_&]:bg-white/20 [html[data-header=dark]_&]:text-white">
                <User className="size-3" strokeWidth={2} />
              </span>
              <span>{data?.email ?? "—"}</span>
              <ChevronDown className="size-3 text-slate-400 [html[data-header=dark]_&]:text-white/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {isAdmin ? (
              <DropdownMenuItem onClick={() => navigate("/")}>用户面板</DropdownMenuItem>
            ) : null}
            {isAdmin ? (
              <DropdownMenuItem onClick={() => navigate("/admin")}>管理面板</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => navigate("/profile")}>个人中心</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
