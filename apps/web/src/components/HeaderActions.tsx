import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Avatar, Dropdown } from "antd";
import {
  DashboardOutlined,
  DownOutlined,
  GlobalOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined
} from "@ant-design/icons";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { UserInfo } from "@/lib/types";

const LOCALES = [
  { code: "zh-CN", label: "简体中文" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "en-US", label: "English" },
  { code: "ja-JP", label: "日本語" },
  { code: "ko-KR", label: "한국어" },
  { code: "vi-VN", label: "Tiếng Việt" },
  { code: "fa-IR", label: "فارسی" }
];

interface Props {
  variant: "user" | "admin";
}

/**
 * Right-side icons in the top header — matches the legacy panel: a config
 * shortcut (admin) or theme entry (user) + language picker + email avatar
 * dropdown. No "账户" / "管理员" text labels.
 */
export function HeaderActions({ variant }: Props) {
  const { isAdmin, logout } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const { data: info } = useQuery({
    queryKey: ["user", "info", "for-header"],
    queryFn: () => apiGet<UserInfo>("/user/info"),
    staleTime: 5 * 60_000
  });

  const accountItems = [
    ...(variant === "user" && isAdmin
      ? [
          {
            key: "admin",
            icon: <DashboardOutlined />,
            label: "管理后台",
            onClick: () => navigate("/admin")
          },
          { type: "divider" as const }
        ]
      : []),
    ...(variant === "admin"
      ? [
          {
            key: "user",
            icon: <DashboardOutlined />,
            label: "用户面板",
            onClick: () => navigate("/dashboard")
          },
          { type: "divider" as const }
        ]
      : [
          {
            key: "profile",
            icon: <UserOutlined />,
            label: "个人中心",
            onClick: () => navigate("/profile")
          }
        ]),
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: () => {
        logout();
        navigate("/login", { replace: true });
      }
    }
  ];

  const langItems = LOCALES.map((l) => ({
    key: l.code,
    label: l.label,
    onClick: () => void i18n.changeLanguage(l.code)
  }));

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 16 }}>
      {variant === "admin" ? (
        <IconButton
          aria-label="主题配置"
          onClick={() => navigate("/admin/theme")}
        >
          <SettingOutlined />
        </IconButton>
      ) : null}
      <Dropdown menu={{ items: langItems }} trigger={["click"]}>
        <IconButton aria-label="语言">
          <GlobalOutlined />
        </IconButton>
      </Dropdown>
      <Dropdown menu={{ items: accountItems }} trigger={["click"]}>
        <span
          style={{
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: "rgba(0,0,0,0.85)"
          }}
        >
          <Avatar size="small" icon={<UserOutlined />} />
          <span>{info?.email ?? ""}</span>
          <DownOutlined style={{ fontSize: 10, color: "rgba(0,0,0,0.45)" }} />
        </span>
      </Dropdown>
    </span>
  );
}

function IconButton({
  children,
  onClick,
  "aria-label": ariaLabel
}: {
  children: React.ReactNode;
  onClick?: () => void;
  "aria-label": string;
}) {
  return (
    <span
      role="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        cursor: "pointer",
        color: "rgba(0,0,0,0.55)",
        fontSize: 18,
        display: "inline-flex"
      }}
    >
      {children}
    </span>
  );
}
