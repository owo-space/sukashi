import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiGet } from "./api";

export type ThemeColor = "default" | "darkblue" | "black" | "green";
export type ThemeSide = "light" | "dark";
export type Panel = "frontend" | "admin";

export interface ThemeConfig {
  app_name: string;
  app_description: string;
  logo: string;
  /** user-facing panel — set via 系统设置 → 个性化 */
  frontend_theme_color: ThemeColor;
  frontend_theme_sidebar: ThemeSide;
  frontend_theme_header: ThemeSide;
  frontend_background_url: string;
  /** admin panel — set via 主题配置 */
  admin_theme_color: ThemeColor;
  admin_theme_sidebar: ThemeSide;
  admin_theme_header: ThemeSide;
}

/** matches the legacy panel-shell THEME_COLORS map */
const COLOR_HEX: Record<ThemeColor, string> = {
  default: "#0665d0",
  darkblue: "#3b5998",
  black: "#343a40",
  green: "#319795"
};

function hexToOklch(hex: string): string {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lR = lin(r), lG = lin(g), lB = lin(b);
  const l = 0.4122214708 * lR + 0.5363325363 * lG + 0.0514459929 * lB;
  const m = 0.2119034982 * lR + 0.6806995451 * lG + 0.1073969566 * lB;
  const s = 0.0883024619 * lR + 0.2817188376 * lG + 0.6299787005 * lB;
  const lc = Math.cbrt(l), mc = Math.cbrt(m), sc = Math.cbrt(s);
  const L = 0.2104542553 * lc + 0.793617785 * mc - 0.0040720468 * sc;
  const A = 1.9779984951 * lc - 2.428592205 * mc + 0.4505937099 * sc;
  const B = 0.0259040371 * lc + 0.7827717662 * mc - 0.808675766 * sc;
  const C = Math.sqrt(A * A + B * B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

function darken(hex: string, factor: number): string {
  const n = hex.replace("#", "");
  const r = Math.round(parseInt(n.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(n.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(n.slice(4, 6), 16) * factor);
  const to = (v: number) => v.toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

const ThemeContext = createContext<ThemeConfig | null>(null);

const DEFAULTS: ThemeConfig = {
  app_name: "透かし",
  app_description: "自由への道",
  logo: "",
  frontend_theme_color: "default",
  frontend_theme_sidebar: "light",
  frontend_theme_header: "light",
  frontend_background_url: "",
  admin_theme_color: "default",
  admin_theme_sidebar: "light",
  admin_theme_header: "light"
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<ThemeConfig>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    apiGet<Partial<ThemeConfig>>("/guest/comm/config")
      .then((res) => {
        if (cancelled) return;
        setCfg({ ...DEFAULTS, ...res });
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <ThemeContext.Provider value={cfg}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeConfig {
  return useContext(ThemeContext) ?? DEFAULTS;
}

/**
 * Apply the chosen panel's theme to the global CSS variables. Layouts
 * call this in a useEffect so navigating between admin and user side
 * swaps the brand color / sidebar mode / header mode independently.
 */
export function useApplyTheme(panel: Panel): void {
  const cfg = useTheme();
  useEffect(() => {
    const root = document.documentElement;
    const color =
      panel === "admin"
        ? COLOR_HEX[cfg.admin_theme_color] ?? COLOR_HEX.default
        : COLOR_HEX[cfg.frontend_theme_color] ?? COLOR_HEX.default;
    const sidebar = panel === "admin" ? cfg.admin_theme_sidebar : cfg.frontend_theme_sidebar;
    const header = panel === "admin" ? cfg.admin_theme_header : cfg.frontend_theme_header;

    const oklch = hexToOklch(color);
    root.style.setProperty("--primary", oklch);
    root.style.setProperty("--ring", oklch);
    root.style.setProperty("--chart-1", oklch);
    root.style.setProperty("--sidebar-primary", oklch);
    root.style.setProperty("--sidebar-ring", oklch);
    root.style.setProperty("--sidebar-accent-foreground", oklch);
    root.style.setProperty("--brand-dark-bg", darken(color, 0.55));
    root.style.setProperty("--brand-darker-bg", darken(color, 0.35));

    root.dataset.sidebar = sidebar;
    root.dataset.header = header;
    document.title = cfg.app_name;
  }, [
    panel,
    cfg.admin_theme_color,
    cfg.admin_theme_sidebar,
    cfg.admin_theme_header,
    cfg.frontend_theme_color,
    cfg.frontend_theme_sidebar,
    cfg.frontend_theme_header,
    cfg.app_name
  ]);
}
