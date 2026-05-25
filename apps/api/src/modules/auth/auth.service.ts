import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import type { User } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { randomToken } from "../common/random.js";
import { unixNow } from "../common/unix.js";
import { SettingsService } from "../settings/settings.service.js";

export interface AuthenticatedUser {
  id: number;
  email: string;
  isAdmin: boolean;
  isStaff: boolean;
}

export interface RequestMeta {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

function jwtSecret(): string {
  return (
    process.env.JWT_SECRET ??
    process.env.APP_KEY ??
    "sukashi-development-secret-change-me"
  );
}

function normalizeAuthorization(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? value;
}

/**
 * Strips Gmail aliases (`a.b+c@gmail.com` → `ab@gmail.com`) so the same
 * mailbox cannot be reused to create multiple accounts when the safe option
 * is enabled. Mirrors V2Board's email_gmail_limit_enable check.
 */
export function normalizeEmailForUniqueness(email: string, stripGmailAlias: boolean): string {
  const lower = email.trim().toLowerCase();
  if (!stripGmailAlias) return lower;
  const [local, domain] = lower.split("@");
  if (!domain || (domain !== "gmail.com" && domain !== "googlemail.com")) return lower;
  const sanitized = (local ?? "").split("+")[0]?.replace(/\./g, "") ?? "";
  return `${sanitized}@gmail.com`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService
  ) {}

  async login(email: string, password: string, meta: RequestMeta) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) {
      throw new UnauthorizedException("邮箱或密码不能为空");
    }

    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    if (!user || !(await this.verifyPassword(user, password))) {
      throw new UnauthorizedException("邮箱或密码错误");
    }
    if (user.banned) {
      throw new UnauthorizedException("账户已被停用");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: unixNow(),
        ...(meta.ip ? { lastLoginIp: meta.ip } : {})
      }
    });

    return this.issueSession(user, meta);
  }

  async resolveUser(authorization?: string): Promise<AuthenticatedUser | null> {
    const token = normalizeAuthorization(authorization);
    if (!token) return null;

    let payload: { id: number; session: string };
    try {
      payload = this.jwtService.verify<{ id: number; session: string }>(token, {
        secret: jwtSecret()
      });
    } catch {
      return null;
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.session }
    });
    if (!session || session.userId !== payload.id) return null;

    if (session.lastUsedAt < unixNow() - 60) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { lastUsedAt: unixNow() }
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, isAdmin: true, isStaff: true }
    });
    return user;
  }

  async requireUser(authorization?: string): Promise<AuthenticatedUser> {
    const user = await this.resolveUser(authorization);
    if (!user) throw new UnauthorizedException("未登录或登录已过期");
    return user;
  }

  async requireAdmin(authorization?: string): Promise<AuthenticatedUser> {
    const user = await this.requireUser(authorization);
    if (!user.isAdmin) throw new UnauthorizedException("无管理员权限");
    return user;
  }

  async requireStaff(authorization?: string): Promise<AuthenticatedUser> {
    const user = await this.requireUser(authorization);
    if (!user.isAdmin && !user.isStaff) throw new UnauthorizedException("无员工权限");
    return user;
  }

  async listSessions(userId: number) {
    const rows = await this.prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastUsedAt: "desc" }
    });
    return Object.fromEntries(
      rows.map((row) => [
        row.id,
        {
          ip: row.ip,
          loginAt: row.createdAt,
          userAgent: row.userAgent,
          authData: row.authData
        }
      ])
    );
  }

  async removeSession(userId: number, sessionId: string): Promise<boolean> {
    const result = await this.prisma.userSession.deleteMany({
      where: { userId, id: sessionId }
    });
    return result.count > 0;
  }

  async removeAllSessions(userId: number): Promise<void> {
    await this.prisma.userSession.deleteMany({ where: { userId } });
  }

  async issueSession(user: User, meta: RequestMeta) {
    const sessionId = randomToken();
    const authData = this.jwtService.sign(
      { id: user.id, session: sessionId },
      { secret: jwtSecret() }
    );
    const now = unixNow();
    await this.prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        authData,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        createdAt: now,
        lastUsedAt: now
      }
    });
    return {
      token: user.token,
      is_admin: user.isAdmin,
      auth_data: authData
    };
  }

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async verifyPassword(user: User, password: string): Promise<boolean> {
    switch (user.passwordAlgo) {
      case "md5":
        return createHash("md5").update(password).digest("hex") === user.password;
      case "sha256":
        return createHash("sha256").update(password).digest("hex") === user.password;
      case "md5salt":
        return (
          createHash("md5")
            .update(`${password}${user.passwordSalt ?? ""}`)
            .digest("hex") === user.password
        );
      default:
        return bcrypt.compare(password, user.password);
    }
  }

  // Helper used by passport register/reset flows
  newUuid(): string {
    return randomUUID();
  }

  newToken(): string {
    return randomToken();
  }
}
