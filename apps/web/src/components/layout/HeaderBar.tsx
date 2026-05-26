import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Menu, Settings, User, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { gravatarUrl } from "@/lib/gravatar";

interface ProfileInfo {
  email?: string;
  is_admin?: boolean | number;
}

export function HeaderBar({
  title,
  settingsHref,
  onMenuClick
}: {
  title: string;
  settingsHref?: string;
  onMenuClick?: () => void;
}) {
  const { logout, isAdmin } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["user.info"],
    queryFn: () => apiGet<ProfileInfo>("/user/info"),
    staleTime: 60_000
  });
  const [avatar, setAvatar] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    if (!data?.email) {
      setAvatar("");
      return;
    }
    gravatarUrl(data.email, 64).then((u) => {
      if (!cancelled) setAvatar(u);
    });
    return () => {
      cancelled = true;
    };
  }, [data?.email]);

  return (
    <header
      className="flex h-14 items-center justify-between gap-3 bg-white border-b border-slate-200 px-4 md:px-6 [html[data-header=dark]_&]:border-transparent [html[data-header=dark]_&]:text-white [html[data-header=dark]_&]:[background:var(--brand-dark-bg)]"
    >
      <div className="flex min-w-0 items-center gap-2">
        {onMenuClick ? (
          <button
            type="button"
            aria-label={t("菜单")}
            onClick={onMenuClick}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden [html[data-header=dark]_&]:text-white/80 [html[data-header=dark]_&]:hover:bg-white/10"
          >
            <Menu className="size-5" />
          </button>
        ) : null}
        <h1 className="truncate text-[15px] text-slate-700 [html[data-header=dark]_&]:text-white">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher />
        {settingsHref ? (
          <Link
            to={settingsHref}
            className="text-slate-500 hover:text-slate-700 [html[data-header=dark]_&]:text-white/70 [html[data-header=dark]_&]:hover:text-white"
            aria-label={t("设置")}
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
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="size-5 rounded-full ring-1 ring-slate-200 [html[data-header=dark]_&]:ring-white/20"
                  loading="lazy"
                />
              ) : (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-slate-200 text-slate-600 [html[data-header=dark]_&]:bg-white/20 [html[data-header=dark]_&]:text-white">
                  <User className="size-3" strokeWidth={2} />
                </span>
              )}
              <span>{data?.email ?? "—"}</span>
              <ChevronDown className="size-3 text-slate-400 [html[data-header=dark]_&]:text-white/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {isAdmin ? (
              <DropdownMenuItem onClick={() => navigate("/")}>{t("用户面板")}</DropdownMenuItem>
            ) : null}
            {isAdmin ? (
              <DropdownMenuItem onClick={() => navigate("/admin")}>{t("管理面板")}</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => navigate("/profile")}>{t("个人中心")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              <LogOut className="size-4" />
              {t("退出登录")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
