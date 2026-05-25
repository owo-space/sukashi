import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  AuthService,
  normalizeEmailForUniqueness,
  type RequestMeta
} from "../auth/auth.service.js";
import { EmailOtpService } from "../auth/email-otp.js";
import { RateLimitService } from "../auth/rate-limit.js";
import { MailService } from "../mail/mail.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { randomChar, randomToken } from "../common/random.js";
import { unixNow } from "../common/unix.js";

const GIB = 1024 ** 3;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Injectable()
export class PassportService {
  constructor(
    private readonly authService: AuthService,
    private readonly mail: MailService,
    private readonly otp: EmailOtpService,
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
    private readonly settings: SettingsService
  ) {}

  async register(input: Record<string, unknown>, meta: RequestMeta) {
    if (this.settings.getBool("stop_register")) {
      throw new ForbiddenException("注册已关闭");
    }

    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new BadRequestException("邮箱格式不正确");
    }
    if (password.length < 8) {
      throw new BadRequestException("密码长度至少 8 位");
    }

    if (this.settings.getBool("email_whitelist_enable")) {
      const allowed = this.settings.getArray<string>("email_whitelist_suffix");
      const suffix = email.split("@")[1] ?? "";
      if (!allowed.includes(suffix)) {
        throw new BadRequestException("邮箱后缀不在白名单内");
      }
    }

    if (this.settings.getBool("email_gmail_limit_enable")) {
      const collapsed = normalizeEmailForUniqueness(email, true);
      const conflict = await this.prisma.user.findFirst({
        where: { email: { contains: collapsed.split("@")[0] ?? "" } }
      });
      if (conflict) throw new BadRequestException("Gmail 别名邮箱已存在");
    }

    if (this.settings.getBool("register_limit_by_ip_enable") && meta.ip) {
      const limit = this.settings.getInt("register_limit_count", 3);
      const window = this.settings.getInt("register_limit_expire", 60) * 60;
      const result = await this.rateLimit.consume(`register:${meta.ip}`, limit, window);
      if (!result.allowed) {
        throw new ForbiddenException(
          `注册过于频繁，请 ${Math.ceil(result.retryAfter / 60)} 分钟后再试`
        );
      }
    }

    if (this.settings.getBool("email_verify")) {
      const code = String(input.email_code ?? "").trim();
      if (!code || !(await this.otp.verify(email, code))) {
        throw new BadRequestException("验证码错误或已过期");
      }
    }

    const inviteCode = String(input.invite_code ?? "").trim();
    let inviteUserId: number | null = null;
    if (this.settings.getBool("invite_force") && !inviteCode) {
      throw new BadRequestException("必须填写邀请码");
    }
    if (inviteCode) {
      const code = await this.prisma.inviteCode.findFirst({
        where: { code: inviteCode, status: 0 }
      });
      if (!code) throw new BadRequestException("邀请码不存在或已使用");
      inviteUserId = code.userId;
      if (!this.settings.getBool("invite_never_expire")) {
        await this.prisma.inviteCode.update({
          where: { id: code.id },
          data: { status: 1, updatedAt: unixNow() }
        });
      }
    }

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException("邮箱已存在");

    const now = unixNow();
    const tryoutPlanData = await this.tryoutPlanAssignment(now);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: await this.authService.hashPassword(password),
        uuid: randomUUID(),
        token: randomToken(),
        inviteUserId,
        createdAt: now,
        updatedAt: now,
        ...tryoutPlanData
      }
    });

    return this.authService.issueSession(user, meta);
  }

  async login(input: Record<string, unknown>, meta: RequestMeta) {
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");

    if (this.settings.getBool("password_limit_enable")) {
      const limit = this.settings.getInt("password_limit_count", 5);
      const window = this.settings.getInt("password_limit_expire", 60) * 60;
      const result = await this.rateLimit.consume(`password:${email}`, limit, window);
      if (!result.allowed) {
        throw new ForbiddenException(
          `密码错误次数过多，请 ${Math.ceil(result.retryAfter / 60)} 分钟后再试`
        );
      }
    }

    return this.authService.login(email, password, meta);
  }

  async sendEmailVerify(input: Record<string, unknown>): Promise<void> {
    const email = String(input.email ?? "").trim().toLowerCase();
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new BadRequestException("邮箱格式不正确");
    }
    const code = await this.otp.issue(email);
    await this.mail.send({
      to: email,
      subject: `${this.settings.getString("app_name", "Sukashi")} - 邮箱验证`,
      templateName: "verify",
      templateValue: { code }
    });
  }

  async forget(input: Record<string, unknown>, meta: RequestMeta) {
    const email = String(input.email ?? "").trim().toLowerCase();
    const password = String(input.password ?? "");
    const code = String(input.email_code ?? "").trim();
    if (!email || !password) throw new BadRequestException("参数不完整");
    if (password.length < 8) throw new BadRequestException("密码长度至少 8 位");

    const limit = await this.rateLimit.consume(`forget:${email}`, 3, 5 * 60);
    if (!limit.allowed) {
      throw new ForbiddenException("操作过于频繁，请稍后再试");
    }
    if (!(await this.otp.verify(email, code))) {
      throw new BadRequestException("验证码错误或已过期");
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException("邮箱不存在");
    if (user.banned) throw new ForbiddenException("账户已被停用");

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await this.authService.hashPassword(password),
        passwordAlgo: null,
        passwordSalt: null,
        updatedAt: unixNow()
      }
    });
    await this.authService.removeAllSessions(user.id);
    return this.authService.issueSession(user, meta);
  }

  private async tryoutPlanAssignment(now: number) {
    const planId = this.settings.getInt("try_out_plan_id", 0);
    if (planId <= 0) return {};
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return {};
    const hours = this.settings.getInt("try_out_hour", 1);
    return {
      planId: plan.id,
      groupId: plan.groupId,
      transferEnable: BigInt(Math.round(plan.transferEnable * GIB)),
      deviceLimit: plan.deviceLimit,
      speedLimit: plan.speedLimit,
      expiredAt: BigInt(now + hours * 3600)
    };
  }
}
