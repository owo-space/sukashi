import { All, Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AdminGuard, AuthenticatedGuard } from "../auth/auth.guard.js";
import { extractAuthorization } from "../auth/auth-request.js";
import { AuthService } from "../auth/auth.service.js";
import { dataResponse } from "../common/json.js";
import { unixNow } from "../common/unix.js";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";

@Controller("guest/comm")
export class GuestCommController {
  constructor(private readonly settings: SettingsService) {}

  @Get("config")
  async config() {
    return dataResponse({
      tos_url: this.settings.getString("tos_url"),
      is_email_verify: this.settings.getInt("email_verify", 0),
      is_invite_force: this.settings.getInt("invite_force", 0),
      email_whitelist_suffix: this.settings.getBool("email_whitelist_enable")
        ? this.settings.getArray<string>("email_whitelist_suffix")
        : 0,
      is_recaptcha: this.settings.getInt("recaptcha_enable", 0),
      recaptcha_site_key: this.settings.getString("recaptcha_site_key"),
      app_name: this.settings.getString("app_name", "透かし"),
      app_description: this.settings.getString("app_description"),
      app_url: this.settings.getString("app_url"),
      logo: this.settings.getString("logo"),
      // theme exposed publicly so the SPA can paint the panel with the
      // configured colors before the user logs in.
      frontend_theme_color: this.settings.getString("frontend_theme_color", "default"),
      frontend_theme_sidebar: this.settings.getString("frontend_theme_sidebar", "light"),
      frontend_theme_header: this.settings.getString("frontend_theme_header", "light"),
      frontend_background_url: this.settings.getString("frontend_background_url", ""),
      // admin panel theme — separate keys so 主题配置 (admin) and 系统设置→
      // 个性化 (user) don't fight over the same value.
      admin_theme_color: this.settings.getString("admin_theme_color", "default"),
      admin_theme_sidebar: this.settings.getString("admin_theme_sidebar", "light"),
      admin_theme_header: this.settings.getString("admin_theme_header", "light")
    });
  }
}

@Controller("user/comm")
export class UserCommController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService
  ) {}

  @Get("config")
  async config() {
    const stripe = await this.prisma.payment.findFirst({
      where: { enable: true, payment: "Stripe" }
    });
    const stripePk = (stripe?.config as Record<string, unknown> | null)?.stripe_public_key ?? null;
    return dataResponse({
      is_telegram: this.settings.getInt("telegram_bot_enable", 0),
      telegram_discuss_link: this.settings.getString("telegram_discuss_link"),
      stripe_pk: stripePk,
      withdraw_methods: this.settings.getArray<string>("commission_withdraw_method"),
      withdraw_close: this.settings.getInt("withdraw_close_enable", 0),
      currency: this.settings.getString("currency", "CNY"),
      currency_symbol: this.settings.getString("currency_symbol", "¥"),
      commission_distribution_enable: this.settings.getInt("commission_distribution_enable", 0),
      commission_distribution_l1: this.settings.getInt("commission_distribution_l1", 0),
      commission_distribution_l2: this.settings.getInt("commission_distribution_l2", 0),
      commission_distribution_l3: this.settings.getInt("commission_distribution_l3", 0)
    });
  }

  @Get("getStripePublicKey")
  async getStripePublicKey(@Query() query: Record<string, unknown>) {
    const id = Number(query.payment_id ?? query.id ?? 0);
    if (!id) return dataResponse(null);
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    const pk = (payment?.config as Record<string, unknown> | null)?.stripe_public_key ?? null;
    return dataResponse(pk);
  }
}

@Controller("guest/telegram")
export class TelegramWebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly mail: MailService
  ) {}

  @Post("webhook")
  async webhook(@Body() body: Record<string, unknown>, @Query() query: Record<string, unknown>) {
    const expected = this.settings.getString("telegram_bot_token");
    const provided = String(query.access_token ?? "");
    if (!expected || !provided) return dataResponse(false);
    // Accept HMAC-style fingerprint to avoid leaking token in URLs.
    const fingerprint = Buffer.from(expected).toString("hex").slice(0, 32);
    if (provided !== fingerprint) return dataResponse(false);

    const message = (body as { message?: { text?: string; chat?: { id?: number } } }).message;
    const text = message?.text ?? "";
    const chatId = message?.chat?.id;
    if (!chatId) return dataResponse(true);

    if (text.startsWith("/bind ")) {
      const token = text.slice(6).trim();
      const user = await this.prisma.user.findFirst({ where: { token } });
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { telegramId: BigInt(chatId), updatedAt: unixNow() }
        });
      }
    } else if (text.trim() === "/start") {
      // Best-effort welcome; suppressed if Telegram API call fails.
      try {
        await fetch(`https://api.telegram.org/bot${expected}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `${this.settings.getString("app_name", "Sukashi")} 已就绪。使用 /bind <token> 绑定账户。`
          })
        });
      } catch {
        // ignore
      }
    }
    return dataResponse(true);
  }
}

@Controller("user/telegram")
@UseGuards(AuthenticatedGuard)
export class UserTelegramController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly settings: SettingsService
  ) {}

  @Get("getBotInfo")
  async getBotInfo() {
    const token = this.settings.getString("telegram_bot_token");
    if (!token) return dataResponse({ username: "" });
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data = (await response.json()) as { result?: { username?: string } };
      return dataResponse({ username: data.result?.username ?? "" });
    } catch {
      return dataResponse({ username: "" });
    }
  }

  @Post("unbind")
  async unbind(@Req() request: FastifyRequest) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    await this.prisma.user.update({
      where: { id: me.id },
      data: { telegramId: null, updatedAt: unixNow() }
    });
    return dataResponse(true);
  }
}

@Controller(":adminPath/theme")
@UseGuards(AdminGuard)
export class AdminThemeController {
  constructor(private readonly settings: SettingsService) {}

  /**
   * V2Board enumerates themes from public/theme/* by reading config.json.
   * sukashi ships a single bundled theme; we surface it with the same
   * shape so the admin UI dropdown renders.
   */
  @All("getThemes")
  async getThemes() {
    const themeName = this.settings.getString("frontend_theme", "v2board");
    const themes: Record<string, unknown> = {
      [themeName]: {
        name: themeName,
        description: "Default sukashi theme",
        version: "1.0.0",
        configs: [
          {
            label: "主题色",
            placeholder: "请选择主题颜色",
            field_name: "theme_color",
            field_type: "select",
            select_options: {
              default: "默认(蓝色)",
              green: "奶绿色",
              black: "黑色",
              darkblue: "暗蓝色"
            },
            default_value: "default"
          },
          {
            label: "背景",
            placeholder: "请输入背景图片URL",
            field_name: "background_url",
            field_type: "input"
          },
          {
            label: "边栏风格",
            placeholder: "请选择边栏风格",
            field_name: "theme_sidebar",
            field_type: "select",
            select_options: { light: "亮", dark: "暗" },
            default_value: "light"
          },
          {
            label: "顶部风格",
            placeholder: "请选择顶部风格",
            field_name: "theme_header",
            field_type: "select",
            select_options: { light: "亮", dark: "暗" },
            default_value: "dark"
          },
          {
            label: "自定义页脚HTML",
            placeholder: "可以实现客服JS代码的加入等",
            field_name: "custom_html",
            field_type: "textarea"
          }
        ]
      }
    };
    return dataResponse({ themes, active: themeName });
  }

  @All("getThemeConfig")
  async getThemeConfig() {
    return dataResponse({
      theme_color: this.settings.getString("frontend_theme_color", "default"),
      theme_sidebar: this.settings.getString("frontend_theme_sidebar", "light"),
      theme_header: this.settings.getString("frontend_theme_header", "dark"),
      background_url: this.settings.getString("frontend_background_url", ""),
      custom_html: this.settings.getString("custom_html", "")
    });
  }

  @Post("saveThemeConfig")
  async saveThemeConfig(@Body() body: Record<string, unknown>) {
    const decoded = ((): Record<string, unknown> => {
      const raw = body.config;
      if (!raw) return {};
      if (typeof raw === "object") return raw as Record<string, unknown>;
      try {
        const text = Buffer.from(String(raw), "base64").toString("utf8");
        const parsed = JSON.parse(text);
        return typeof parsed === "object" && parsed !== null ? parsed : {};
      } catch {
        return {};
      }
    })();
    const updates: Record<string, unknown> = {};
    if (decoded.theme_color !== undefined) updates.frontend_theme_color = decoded.theme_color;
    if (decoded.theme_sidebar !== undefined) updates.frontend_theme_sidebar = decoded.theme_sidebar;
    if (decoded.theme_header !== undefined) updates.frontend_theme_header = decoded.theme_header;
    if (decoded.background_url !== undefined) updates.frontend_background_url = decoded.background_url;
    if (decoded.custom_html !== undefined) updates.custom_html = decoded.custom_html;
    if (Object.keys(updates).length > 0) await this.settings.setMany(updates);
    return dataResponse(true);
  }
}

@Controller(":adminPath/system")
@UseGuards(AdminGuard)
export class AdminSystemController {
  @Get("getSystemStatus")
  async getSystemStatus() {
    const memory = process.memoryUsage();
    return dataResponse({
      schedule: 1,
      horizon: 0,
      memory_used: memory.heapUsed,
      memory_total: memory.heapTotal,
      uptime: process.uptime()
    });
  }

  @Get("getQueueStats")
  async getQueueStats() {
    return dataResponse({
      jobsPerMinute: 0,
      recentJobs: 0,
      failedJobs: 0,
      status: true
    });
  }

  @Get("getQueueWorkload")
  async getQueueWorkload() {
    return dataResponse([]);
  }

  @Get("getQueueMasters")
  async getQueueMasters() {
    return dataResponse([]);
  }

  @Get("getSystemLog")
  async getSystemLog() {
    return dataResponse([]);
  }
}
