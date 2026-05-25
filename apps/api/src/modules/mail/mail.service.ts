import { Injectable, Logger } from "@nestjs/common";
import nodemailer, { type Transporter } from "nodemailer";
import { PrismaService } from "../database/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { unixNow } from "../common/unix.js";

type MailMessage = {
  to: string;
  subject: string;
  templateName: string;
  templateValue?: Record<string, unknown>;
};

function renderTemplate(
  templateName: string,
  vars: Record<string, unknown>
): string {
  // Templates are intentionally simple HTML strings. V2Board ships richer
  // Blade templates; the panel only really exercises the `notify` and
  // `verify` templates so they're the only ones we hard-code.
  const wrap = (body: string): string => {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${String(vars.subject ?? "")}</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; padding: 24px;"><h2 style="margin-top:0;">${String(vars.name ?? "")}</h2>${body}<hr style="margin-top:32px;border:none;border-top:1px solid #eee;"><p style="color:#888;font-size:12px;">${String(vars.name ?? "")}</p></body></html>`;
  };
  if (templateName === "verify") {
    return wrap(
      `<p>您的验证码是：<strong style="font-size:20px;">${String(vars.code ?? "")}</strong></p><p>验证码 5 分钟内有效。</p>`
    );
  }
  return wrap(`<p>${String(vars.content ?? "")}</p>`);
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private transporterFingerprint = "";

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService
  ) {}

  /**
   * V2Board enqueues SendEmailJob and lets a worker drain the queue. Here we
   * just send inline and log to v2_mail_log so the admin UI can audit. If
   * SMTP isn't configured the call is a no-op (writes log row with error).
   */
  async send(message: MailMessage): Promise<void> {
    const host = this.settings.getString("email_host");
    const from = this.settings.getString("email_from_address");
    const html = renderTemplate(message.templateName, {
      ...message.templateValue,
      name: this.settings.getString("app_name", "Sukashi"),
      url: this.settings.getString("app_url"),
      subject: message.subject
    });

    if (!host || !from) {
      await this.log(message, "SMTP not configured");
      return;
    }
    try {
      const transporter = this.transporter ?? this.buildTransporter();
      if (!transporter) {
        await this.log(message, "SMTP not configured");
        return;
      }
      await transporter.sendMail({
        from,
        to: message.to,
        subject: message.subject,
        html
      });
      await this.log(message, null);
    } catch (error) {
      this.logger.error(`mail send failed: ${(error as Error).message}`);
      await this.log(message, (error as Error).message);
    }
  }

  private buildTransporter(): Transporter | undefined {
    const host = this.settings.getString("email_host");
    const port = this.settings.getInt("email_port", 587);
    const user = this.settings.getString("email_username");
    const pass = this.settings.getString("email_password");
    const encryption = this.settings.getString("email_encryption", "tls").toLowerCase();
    const fingerprint = `${host}:${port}:${user}:${encryption}`;
    if (this.transporter && this.transporterFingerprint === fingerprint) {
      return this.transporter;
    }
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: encryption === "ssl",
      requireTLS: encryption === "tls",
      auth: user ? { user, pass } : undefined
    });
    this.transporterFingerprint = fingerprint;
    return this.transporter;
  }

  /**
   * Force a rebuild on next send. The admin save endpoint calls this after
   * SMTP settings change.
   */
  invalidateTransporter(): void {
    delete this.transporter;
    this.transporterFingerprint = "";
  }

  private async log(message: MailMessage, error: string | null): Promise<void> {
    const now = unixNow();
    try {
      await this.prisma.mailLog.create({
        data: {
          email: message.to.slice(0, 128),
          subject: message.subject,
          templateName: message.templateName,
          error,
          createdAt: now,
          updatedAt: now
        }
      });
    } catch (logErr) {
      this.logger.error(`mail log write failed: ${(logErr as Error).message}`);
    }
  }
}
