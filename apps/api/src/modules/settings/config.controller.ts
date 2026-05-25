import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AdminGuard } from "../auth/auth.guard.js";
import { extractAuthorization } from "../auth/auth-request.js";
import { AuthService } from "../auth/auth.service.js";
import { dataResponse } from "../common/json.js";
import { MailService } from "../mail/mail.service.js";
import { SettingsService } from "./settings.service.js";
import { SETTING_GROUPS } from "./settings.defaults.js";

@Controller(":adminPath/config")
@UseGuards(AdminGuard)
export class ConfigController {
  constructor(
    private readonly settings: SettingsService,
    private readonly mail: MailService,
    private readonly authService: AuthService
  ) {}

  @Get("fetch")
  async fetch(@Query() query: Record<string, unknown>) {
    const grouped = this.settings.fetchGrouped();
    const key = String(query.key ?? "");
    if (key && grouped[key]) {
      return dataResponse({ [key]: grouped[key] });
    }
    return dataResponse(grouped);
  }

  @Post("save")
  async save(@Body() body: Record<string, unknown>) {
    const allowedKeys = new Set(Object.values(SETTING_GROUPS).flat());
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body ?? {})) {
      if (allowedKeys.has(key)) updates[key] = value;
    }
    if (Object.keys(updates).length > 0) {
      await this.settings.setMany(updates);
      this.mail.invalidateTransporter();
    }
    return dataResponse(true);
  }

  @Get("getEmailTemplate")
  async getEmailTemplate() {
    return dataResponse(["default"]);
  }

  @Get("getThemeTemplate")
  async getThemeTemplate() {
    return dataResponse(["default"]);
  }

  @Post("testSendMail")
  async testSendMail(@Req() request: FastifyRequest) {
    const user = await this.authService.requireUser(extractAuthorization(request));
    await this.mail.send({
      to: user.email,
      subject: `${this.settings.getString("app_name", "Sukashi")} 测试邮件`,
      templateName: "notify",
      templateValue: { content: "如果你收到本邮件，说明 SMTP 配置可用。" }
    });
    return dataResponse(true);
  }

  @Post("setTelegramWebhook")
  async setTelegramWebhook(@Body() body: Record<string, unknown>) {
    const token = String(body.telegram_bot_token ?? this.settings.getString("telegram_bot_token"));
    if (!token) return dataResponse(false);
    // Telegram webhook registration: best-effort, just calls the API and saves the token.
    try {
      const appUrl = this.settings.getString("app_url");
      if (appUrl) {
        const secret = Buffer.from(token).toString("hex").slice(0, 32);
        const hookUrl = `${appUrl}/api/v1/guest/telegram/webhook?access_token=${secret}`;
        await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: hookUrl })
        });
      }
      await this.settings.set("telegram_bot_token", token);
      return dataResponse(true);
    } catch {
      return dataResponse(false);
    }
  }
}
