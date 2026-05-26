import { Link, useNavigate } from "react-router-dom";
import { LogOut, Settings, UserRound, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-base text-foreground">{title}</h1>
      <div className="flex items-center gap-2">
        {settingsHref ? (
          <Button asChild size="icon" variant="ghost">
            <Link to={settingsHref}>
              <Settings className="size-4" />
            </Link>
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-1.5 text-sm">
              <UserRound className="size-4" />
              <span>{data?.email ?? "—"}</span>
              <ChevronDown className="size-3 opacity-60" />
            </Button>
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
