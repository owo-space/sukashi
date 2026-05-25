import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Injectable } from "@nestjs/common";
import { SettingsService } from "../settings/settings.service.js";

const SPA_INDEX_PATH = fileURLToPath(
  new URL("../../../../web/dist/index.html", import.meta.url)
);

const DEFAULT_PANEL_TITLE = "透かし";
const DEFAULT_PANEL_DESCRIPTION = "自由への道";

@Injectable()
export class PanelShellService {
  private cachedTemplate: string | null = null;

  constructor(private readonly settings: SettingsService) {}

  async render(): Promise<string> {
    const template = await this.loadTemplate();
    const title = this.settings.getString("app_name", DEFAULT_PANEL_TITLE);
    const description = this.settings.getString(
      "app_description",
      DEFAULT_PANEL_DESCRIPTION
    );
    const bootstrap = {
      title,
      description,
      logo: this.settings.getString("logo", ""),
      currency_symbol: this.settings.getString("currency_symbol", "¥"),
      theme_color: this.settings.getString("frontend_theme_color", "#0665d0"),
      background_url: this.settings.getString("frontend_background_url", ""),
      tos_url: this.settings.getString("tos_url", "")
    };

    return template
      .replace("__SUKASHI_TITLE__", escapeHtml(title))
      .replace("__SUKASHI_DESCRIPTION__", escapeHtml(description))
      .replace("__SUKASHI_THEME_COLOR__", escapeHtml(bootstrap.theme_color))
      .replace(
        "/*__SUKASHI_BOOTSTRAP__*/",
        `window.__SUKASHI_BOOTSTRAP__ = ${serializeBootstrap(bootstrap)};`
      );
  }

  private async loadTemplate(): Promise<string> {
    if (this.cachedTemplate !== null) return this.cachedTemplate;
    this.cachedTemplate = await readFile(SPA_INDEX_PATH, "utf8");
    return this.cachedTemplate;
  }
}

function serializeBootstrap(settings: unknown) {
  return JSON.stringify(settings).replaceAll("</script", "<\\/script");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
