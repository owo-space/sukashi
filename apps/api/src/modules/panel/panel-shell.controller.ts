import { Controller, Get, Header } from "@nestjs/common";
import { SettingsService } from "../settings/settings.service.js";

const I18N_LOCALES = [
  "zh-CN",
  "en-US",
  "ja-JP",
  "vi-VN",
  "ko-KR",
  "zh-TW",
  "fa-IR"
];

type ThemeColor = "darkblue" | "black" | "default" | "green";

const THEME_COLORS: Record<ThemeColor, string> = {
  darkblue: "#3b5998",
  black: "#343a40",
  default: "#0665d0",
  green: "#319795"
};
const DEFAULT_PANEL_TITLE = "透かし";
const DEFAULT_PANEL_DESCRIPTION = "自由への道";
const DEFAULT_PANEL_VERSION = "1.7.6-sukad.2";

@Controller()
export class PanelShellController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Header("Content-Type", "text/html; charset=utf-8")
  userPanel() {
    const theme = this.settings.getString("frontend_theme", "default") || "default";
    const themeColor = this.themeColor();
    const settings = {
      title: this.title(),
      assets_path: `/theme/${theme}/assets`,
      theme: {
        sidebar: this.settings.getString("frontend_theme_sidebar", "light"),
        header: this.settings.getString("frontend_theme_header", "dark"),
        color: themeColor
      },
      version: this.version(),
      background_url: this.settings.getString("frontend_background_url", ""),
      description: this.settings.getString("app_description", DEFAULT_PANEL_DESCRIPTION),
      i18n: I18N_LOCALES,
      logo: this.settings.getString("logo", ""),
      homepage: this.settings.getString("homepage", "")
    };

    const i18nScripts = I18N_LOCALES.map(
      (locale) =>
        `<script src="/theme/${theme}/assets/i18n/${locale}.js?v=${this.version()}"></script>`
    ).join("\n    ");

    return `<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="/theme/${theme}/assets/components.chunk.css?v=${this.version()}">
    <link rel="stylesheet" href="/theme/${theme}/assets/umi.css?v=${this.version()}">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no">
    <meta name="theme-color" content="${THEME_COLORS[themeColor]}">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="apple-touch-icon" href="/favicon.svg">
    <title>${escapeHtml(this.title())}</title>
    <script>window.routerBase = "/";</script>
    <script>window.settings = ${serializeSettings(settings)};</script>
    ${i18nScripts}
</head>
<body>
<div id="root"></div>
${this.settings.getString("custom_html", "")}
<script src="/theme/${theme}/assets/vendors.async.js?v=${this.version()}"></script>
<script src="/theme/${theme}/assets/components.async.js?v=${this.version()}"></script>
<script src="/theme/${theme}/assets/umi.js?v=${this.version()}"></script>
</body>
</html>`;
  }

  @Get("admin")
  @Header("Content-Type", "text/html; charset=utf-8")
  adminPanel() {
    const settings = {
      title: this.title(),
      theme: {
        sidebar: this.settings.getString("frontend_theme_sidebar", "light"),
        header: this.settings.getString("frontend_theme_header", "dark"),
        color: this.themeColor()
      },
      version: this.version(),
      background_url: this.settings.getString("frontend_background_url", ""),
      logo: this.settings.getString("logo", ""),
      secure_path: this.settings.getAdminPath()
    };

    return `<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="/assets/admin/components.chunk.css?v=${this.version()}">
    <link rel="stylesheet" href="/assets/admin/umi.css?v=${this.version()}">
    <link rel="stylesheet" href="/assets/admin/custom.css?v=${this.version()}">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="apple-touch-icon" href="/favicon.svg">
    <title>${escapeHtml(this.title())}</title>
    <script>window.routerBase = "/";</script>
    <script>window.settings = ${serializeSettings(settings)};</script>
</head>
<body>
<div id="root"></div>
<script src="/assets/admin/vendors.async.js?v=${this.version()}"></script>
<script src="/assets/admin/components.async.js?v=${this.version()}"></script>
<script src="/assets/admin/umi.js?v=${this.version()}"></script>
</body>
</html>`;
  }

  private title() {
    return this.settings.getString("app_name", DEFAULT_PANEL_TITLE);
  }

  private version() {
    return this.settings.getString("panel_version", DEFAULT_PANEL_VERSION);
  }

  private themeColor(): ThemeColor {
    const color = this.settings.getString("frontend_theme_color", "default");
    if (color === "darkblue" || color === "black" || color === "green") {
      return color;
    }
    return "default";
  }
}

function serializeSettings(settings: unknown) {
  return JSON.stringify(settings).replaceAll("</script", "<\\/script");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
