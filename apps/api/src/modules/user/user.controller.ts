import { All, Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Plan, Prisma, User } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { createHash, randomUUID } from "node:crypto";
import { AuthService } from "../auth/auth.service.js";
import { AdminGuard, AuthenticatedGuard } from "../auth/auth.guard.js";
import { extractAuthorization } from "../auth/auth-request.js";
import { QuickLoginService } from "../auth/quick-login.js";
import {
  asBigInt,
  asBoolean,
  asNullableNumber,
  firstQueryNumber
} from "../common/coercion.js";
import {
  buildUserFilterWhere,
  parseSortField,
  parseSortType
} from "../common/filter.js";
import { dataResponse, toJsonSafe } from "../common/json.js";
import { randomToken } from "../common/random.js";
import { unixNow } from "../common/unix.js";
import { PrismaService } from "../database/prisma.service.js";
import { MailService } from "../mail/mail.service.js";
import { SettingsService } from "../settings/settings.service.js";

const GIB = 1024 ** 3;

function subscribeUrl(token: string, settings: SettingsService): string {
  const base =
    settings.getString("subscribe_url", "") ||
    settings.getString("app_url", "") ||
    process.env.PANEL_APP_URL ||
    "";
  const path = settings.getString("subscribe_path", "") || "/api/v1/client/subscribe";
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function legacyExpiredAt(value: bigint | number | null | undefined): bigint | null {
  if (value === undefined || value === null) return null;
  if (Number(value) <= 0) return null;
  return typeof value === "bigint" ? value : BigInt(value);
}

function userToLegacy(
  user: User,
  plan?: Plan | null,
  inviteUser?: Pick<User, "id" | "email"> | null,
  extras?: { aliveIp?: number; subscribeUrl?: string }
) {
  return {
    id: user.id,
    invite_user_id: user.inviteUserId,
    telegram_id: user.telegramId,
    email: user.email,
    password: "",
    balance: user.balance,
    discount: user.discount,
    commission_type: user.commissionType,
    commission_rate: user.commissionRate,
    commission_balance: user.commissionBalance,
    t: user.t,
    u: user.u,
    d: user.d,
    total_used: user.u + user.d,
    transfer_enable: user.transferEnable,
    device_limit: user.deviceLimit,
    banned: user.banned ? 1 : 0,
    is_admin: user.isAdmin ? 1 : 0,
    last_login_at: user.lastLoginAt,
    is_staff: user.isStaff ? 1 : 0,
    last_login_ip: user.lastLoginIp,
    uuid: user.uuid,
    group_id: user.groupId,
    plan_id: user.planId,
    plan_name: plan?.name ?? null,
    speed_limit: user.speedLimit,
    auto_renewal: user.autoRenewal ? 1 : 0,
    remind_expire: user.remindExpire ? 1 : 0,
    remind_traffic: user.remindTraffic ? 1 : 0,
    token: user.token,
    subscribe_url: extras?.subscribeUrl ?? "",
    expired_at: legacyExpiredAt(user.expiredAt),
    remarks: user.remarks,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
    alive_ip: extras?.aliveIp ?? 0,
    invite_user: inviteUser
      ? {
          id: inviteUser.id,
          email: inviteUser.email
        }
      : null
  };
}

function planToLegacy(plan: Plan | null | undefined) {
  if (!plan) {
    return {
      id: 0,
      group_id: null,
      transfer_enable: 0,
      device_limit: null,
      name: "",
      speed_limit: null,
      show: 0,
      sort: null,
      renew: 0,
      content: null,
      month_price: null,
      quarter_price: null,
      half_year_price: null,
      year_price: null,
      two_year_price: null,
      three_year_price: null,
      onetime_price: null,
      reset_price: null,
      reset_traffic_method: null,
      capacity_limit: null,
      created_at: null,
      updated_at: null
    };
  }
  return {
    id: plan.id,
    group_id: plan.groupId,
    transfer_enable: plan.transferEnable,
    device_limit: plan.deviceLimit,
    name: plan.name,
    speed_limit: plan.speedLimit,
    show: plan.show ? 1 : 0,
    sort: plan.sort,
    renew: plan.renew ? 1 : 0,
    content: plan.content,
    month_price: plan.monthPrice,
    quarter_price: plan.quarterPrice,
    half_year_price: plan.halfYearPrice,
    year_price: plan.yearPrice,
    two_year_price: plan.twoYearPrice,
    three_year_price: plan.threeYearPrice,
    onetime_price: plan.onetimePrice,
    reset_price: plan.resetPrice,
    reset_traffic_method: plan.resetTrafficMethod,
    capacity_limit: plan.capacityLimit,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt
  };
}

async function aliveIpCount(prisma: PrismaService, userId: number): Promise<number> {
  const rows = await prisma.userAliveIp.findMany({
    where: { userId, recordedAt: { gt: unixNow() - 120 } },
    select: { ip: true }
  });
  const unique = new Set(rows.map((row) => row.ip));
  return unique.size;
}

@Controller("user")
@UseGuards(AuthenticatedGuard)
export class UserController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly quickLogin: QuickLoginService,
    private readonly settings: SettingsService
  ) {}

  @Get("checkLogin")
  async checkLogin(@Req() request: FastifyRequest) {
    const user = await this.authService.resolveUser(extractAuthorization(request));
    return dataResponse({
      is_login: Boolean(user),
      ...(user?.isAdmin ? { is_admin: true } : {})
    });
  }

  @Get("info")
  async info(@Req() request: FastifyRequest) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: authUser.id }
    });
    const plan = user.planId
      ? await this.prisma.plan.findUnique({ where: { id: user.planId } })
      : null;
    return dataResponse({
      ...userToLegacy(user, plan, null, {
        aliveIp: await aliveIpCount(this.prisma, user.id),
        subscribeUrl: subscribeUrl(user.token, this.settings)
      }),
      plan: planToLegacy(plan),
      avatar_url: `https://cravatar.cn/avatar/${createHash("md5")
        .update(user.email)
        .digest("hex")}?s=64&d=identicon`
    });
  }

  @Get("getSubscribe")
  async getSubscribe(@Req() request: FastifyRequest) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: authUser.id }
    });
    const plan = user.planId
      ? await this.prisma.plan.findUnique({ where: { id: user.planId } })
      : null;
    return dataResponse({
      ...userToLegacy(user, plan, null, {
        aliveIp: await aliveIpCount(this.prisma, user.id),
        subscribeUrl: subscribeUrl(user.token, this.settings)
      }),
      plan: planToLegacy(plan),
      reset_day: this.settings.getInt("show_subscribe_expire", 5) > 0 ? null : null,
      allow_new_period: this.settings.getInt("allow_new_period", 0)
    });
  }

  @Get("getStat")
  async getStat(@Req() request: FastifyRequest) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    const [unpaidOrders, openTickets, invitedUsers] = await Promise.all([
      this.prisma.order.count({ where: { userId: authUser.id, status: 0 } }),
      this.prisma.ticket.count({ where: { userId: authUser.id, status: 0 } }),
      this.prisma.user.count({ where: { inviteUserId: authUser.id } })
    ]);
    return dataResponse([unpaidOrders, openTickets, invitedUsers]);
  }

  @Get("getActiveSession")
  async getActiveSession(@Req() request: FastifyRequest) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    return dataResponse(await this.authService.listSessions(authUser.id));
  }

  @Post("removeActiveSession")
  async removeActiveSession(
    @Body() body: Record<string, unknown>,
    @Req() request: FastifyRequest
  ) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    return dataResponse(
      await this.authService.removeSession(authUser.id, String(body.session_id ?? ""))
    );
  }

  @Get("resetSecurity")
  async resetSecurity(@Req() request: FastifyRequest) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    const token = randomUUID().replaceAll("-", "");
    await this.prisma.user.update({
      where: { id: authUser.id },
      data: {
        uuid: randomUUID(),
        token,
        updatedAt: unixNow()
      }
    });
    return dataResponse(subscribeUrl(token, this.settings));
  }

  @Post("update")
  async update(
    @Body() body: Record<string, unknown>,
    @Req() request: FastifyRequest
  ) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    await this.prisma.user.update({
      where: { id: authUser.id },
      data: {
        updatedAt: unixNow(),
        ...(body.auto_renewal === undefined
          ? {}
          : { autoRenewal: asBoolean(body.auto_renewal) }),
        ...(body.remind_expire === undefined
          ? {}
          : { remindExpire: asBoolean(body.remind_expire) }),
        ...(body.remind_traffic === undefined
          ? {}
          : { remindTraffic: asBoolean(body.remind_traffic) })
      }
    });
    return dataResponse(true);
  }

  @Post("changePassword")
  async changePassword(
    @Body() body: Record<string, unknown>,
    @Req() request: FastifyRequest
  ) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    const oldPassword = String(body.old_password ?? "");
    const newPassword = String(body.new_password ?? "");
    if (!oldPassword || !newPassword) {
      return dataResponse(false);
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: authUser.id } });
    // Re-use login path to validate old password without touching session.
    try {
      await this.authService.login(user.email, oldPassword, {});
    } catch {
      return dataResponse(false);
    }
    await this.prisma.user.update({
      where: { id: authUser.id },
      data: {
        password: await this.authService.hashPassword(newPassword),
        passwordAlgo: null,
        passwordSalt: null,
        updatedAt: unixNow()
      }
    });
    await this.authService.removeAllSessions(authUser.id);
    return dataResponse(true);
  }

  /**
   * Same handler as passport/auth/getQuickLoginUrl but in the user namespace
   * — V2Board exposes it under both routes, the admin panel uses /user/...
   * when impersonating from the user list.
   */
  @Post("getQuickLoginUrl")
  async userGetQuickLoginUrl(
    @Body() body: Record<string, unknown>,
    @Req() request: FastifyRequest
  ) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const code = await this.quickLogin.issue(me.id);
    const redirect = String(body.redirect ?? "dashboard");
    const appUrl = this.settings.getString("app_url");
    const path = `/#/login?verify=${encodeURIComponent(code)}&redirect=${encodeURIComponent(redirect)}`;
    return dataResponse(appUrl ? `${appUrl}${path}` : path);
  }

  /**
   * Alias for /user/telegram/unbind — V2Board exposes this under
   * /user/unbindTelegram with GET (sidebar link) and POST (form submit).
   */
  @All("unbindTelegram")
  async unbindTelegram(@Req() request: FastifyRequest) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    await this.prisma.user.update({
      where: { id: me.id },
      data: { telegramId: null, updatedAt: unixNow() }
    });
    return dataResponse(true);
  }

  @Post("transfer")
  async transfer(
    @Body() body: Record<string, unknown>,
    @Req() request: FastifyRequest
  ) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    const amount = Math.round(Number(body.transfer_amount ?? 0));
    if (!Number.isFinite(amount) || amount <= 0) return dataResponse(false);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: authUser.id },
      select: { commissionBalance: true }
    });
    if (user.commissionBalance < amount) return dataResponse(false);
    await this.prisma.user.update({
      where: { id: authUser.id },
      data: {
        balance: { increment: amount },
        commissionBalance: { decrement: amount },
        updatedAt: unixNow()
      }
    });
    return dataResponse(true);
  }
}

@Controller(":adminPath/user")
@UseGuards(AdminGuard)
export class AdminUserController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly mail: MailService,
    private readonly settings: SettingsService
  ) {}

  @Get("fetch")
  async fetch(@Query() query: Record<string, unknown>) {
    return this.fetchWithQuery(query);
  }

  @Get("getUserInfoById")
  async getUserInfoById(@Query() query: Record<string, unknown>) {
    const id = Number(query.id);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const [plan, inviteUser, aliveIp] = await Promise.all([
      user.planId ? this.prisma.plan.findUnique({ where: { id: user.planId } }) : null,
      user.inviteUserId
        ? this.prisma.user.findUnique({
            where: { id: user.inviteUserId },
            select: { id: true, email: true }
          })
        : null,
      aliveIpCount(this.prisma, user.id)
    ]);
    return dataResponse(
      userToLegacy(user, plan, inviteUser, {
        aliveIp,
        subscribeUrl: subscribeUrl(user.token, this.settings)
      })
    );
  }

  @Post("update")
  async update(@Body() body: Record<string, unknown>) {
    const id = asNullableNumber(body.id);
    const isCreate = id === null;
    const currentUser = isCreate
      ? null
      : await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const data: Prisma.UserUpdateInput = {
      updatedAt: unixNow()
    };

    if (body.email !== undefined) {
      const nextEmail = String(body.email).trim().toLowerCase();
      if (nextEmail !== currentUser?.email) {
        const taken = await this.prisma.user.findUnique({ where: { email: nextEmail } });
        if (taken) throw new Error("邮箱已被使用");
      }
      data.email = nextEmail;
    }
    if (body.password) {
      data.password = await this.authService.hashPassword(String(body.password));
      data.passwordAlgo = null;
      data.passwordSalt = null;
    }
    if (body.invite_user_email !== undefined) {
      const inviteEmail = String(body.invite_user_email ?? "").trim().toLowerCase();
      data.inviteUserId = inviteEmail
        ? (
            await this.prisma.user.findUnique({
              where: { email: inviteEmail },
              select: { id: true }
            })
          )?.id ?? null
        : null;
    }
    if (body.balance !== undefined) data.balance = Number(body.balance);
    if (body.commission_balance !== undefined) {
      data.commissionBalance = Number(body.commission_balance);
    }

    if (body.plan_id !== undefined) {
      const nextPlanId = asNullableNumber(body.plan_id);
      if (isCreate || nextPlanId !== currentUser?.planId) {
        Object.assign(data, await this.planAssignmentData(body.plan_id));
      }
    }

    if (hasValue(body.u)) data.u = asBigInt(body.u);
    if (hasValue(body.d)) data.d = asBigInt(body.d);
    if (hasValue(body.transfer_enable)) {
      data.transferEnable = asBigInt(body.transfer_enable);
    }
    if (body.device_limit !== undefined) data.deviceLimit = asNullableNumber(body.device_limit);
    if (body.expired_at !== undefined) {
      // PHP semantics: null = permanent. Never store 0; coerce empty/0/null to null.
      const expiredRaw = body.expired_at;
      data.expiredAt =
        expiredRaw === null || expiredRaw === "" || Number(expiredRaw) <= 0
          ? null
          : asBigInt(expiredRaw);
    }
    if (body.banned !== undefined) {
      data.banned = asBoolean(body.banned);
      if (data.banned && id !== null) {
        await this.authService.removeAllSessions(id);
      }
    }
    if (body.commission_type !== undefined) {
      data.commissionType = Number(body.commission_type);
    }
    if (body.commission_rate !== undefined) {
      data.commissionRate = asNullableNumber(body.commission_rate);
    }
    if (body.discount !== undefined) data.discount = asNullableNumber(body.discount);
    if (body.speed_limit !== undefined) {
      data.speedLimit = asNullableNumber(body.speed_limit);
    }
    if (body.is_admin !== undefined) data.isAdmin = asBoolean(body.is_admin);
    if (body.is_staff !== undefined) data.isStaff = asBoolean(body.is_staff);
    if (body.remarks !== undefined) {
      data.remarks =
        body.remarks === undefined || body.remarks === null ? null : String(body.remarks);
    }

    let user;
    if (isCreate) {
      if (!data.email) throw new Error("邮箱不能为空");
      if (!data.password) throw new Error("密码不能为空");
      user = await this.prisma.user.create({
        data: {
          ...(data as Prisma.UserUncheckedCreateInput),
          uuid: randomUUID(),
          token: randomToken(),
          createdAt: unixNow()
        }
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: id! },
        data
      });
    }
    const plan = user.planId
      ? await this.prisma.plan.findUnique({ where: { id: user.planId } })
      : null;
    return dataResponse(userToLegacy(user, plan));
  }

  @Post("generate")
  async generate(@Body() body: Record<string, unknown>) {
    const count = Math.max(1, Number(body.generate_count ?? 1));
    const suffix = String(body.email_suffix ?? "sukashi.local")
      .trim()
      .replace(/^@/, "");
    const prefix = String(body.email_prefix ?? "").trim();
    const now = unixNow();
    const planData = await this.planAssignmentData(body.plan_id);
    const created: string[] = [];

    const expiredAtValue = (() => {
      const raw = body.expired_at;
      if (raw === undefined || raw === null || raw === "" || Number(raw) <= 0) return null;
      return asBigInt(raw);
    })();

    for (let index = 0; index < count; index += 1) {
      const email = `${prefix || `user${Date.now()}${index}`}@${suffix}`.toLowerCase();
      const password = String(body.password || email);
      await this.prisma.user.create({
        data: {
          email,
          password: await this.authService.hashPassword(password),
          uuid: randomUUID(),
          token: randomToken(),
          expiredAt: expiredAtValue,
          createdAt: now,
          updatedAt: now,
          ...planData
        }
      });
      created.push(`${email},${password}`);
    }

    return {
      data: true,
      buffer: created.join("\n"),
      code: 200,
      message: ""
    };
  }

  @Post("resetSecret")
  async resetSecret(@Body() body: Record<string, unknown>) {
    await this.prisma.user.update({
      where: { id: Number(body.id) },
      data: {
        uuid: randomUUID(),
        token: randomToken(),
        updatedAt: unixNow()
      }
    });
    return dataResponse(true);
  }

  @Post("delUser")
  async delUser(@Body() body: Record<string, unknown>) {
    const id = Number(body.id);
    await this.cascadeDeleteUser(id);
    return dataResponse(true);
  }

  @Post("setInviteUser")
  async setInviteUser(@Body() body: Record<string, unknown>) {
    const id = Number(body.id);
    const inviteEmail = String(body.invite_user_email ?? "").trim().toLowerCase();
    const inviteUserId = inviteEmail
      ? (
          await this.prisma.user.findUnique({
            where: { email: inviteEmail },
            select: { id: true }
          })
        )?.id ?? null
      : null;
    await this.prisma.user.update({
      where: { id },
      data: { inviteUserId, updatedAt: unixNow() }
    });
    return dataResponse(true);
  }

  @Post("ban")
  async ban(@Body() body: Record<string, unknown>) {
    const where = await this.buildFilterWhere(body.filter);
    const users = await this.prisma.user.findMany({
      where,
      select: { id: true }
    });
    if (users.length === 0) return dataResponse(true);
    const ids = users.map((user) => user.id);
    await Promise.all([
      this.prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { banned: true, updatedAt: unixNow() }
      }),
      this.prisma.userSession.deleteMany({ where: { userId: { in: ids } } })
    ]);
    return dataResponse(true);
  }

  @Post("allDel")
  async allDel(@Body() body: Record<string, unknown>) {
    const where = await this.buildFilterWhere(body.filter);
    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, isAdmin: true }
    });
    const ids = users.filter((user) => !user.isAdmin).map((user) => user.id);
    if (ids.length === 0) return dataResponse(true);
    await this.prisma.$transaction(async (tx) => {
      await tx.userSession.deleteMany({ where: { userId: { in: ids } } });
      await tx.order.deleteMany({ where: { userId: { in: ids } } });
      await tx.inviteCode.deleteMany({ where: { userId: { in: ids } } });
      const tickets = await tx.ticket.findMany({
        where: { userId: { in: ids } },
        select: { id: true }
      });
      const ticketIds = tickets.map((ticket) => ticket.id);
      if (ticketIds.length > 0) {
        await tx.ticketMessage.deleteMany({ where: { ticketId: { in: ticketIds } } });
        await tx.ticket.deleteMany({ where: { id: { in: ticketIds } } });
      }
      await tx.user.updateMany({
        where: { inviteUserId: { in: ids } },
        data: { inviteUserId: null }
      });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
    return dataResponse(true);
  }

  @Post("dumpCSV")
  async dumpCSV(@Body() body: Record<string, unknown>) {
    const where = await this.buildFilterWhere(body.filter);
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { id: "asc" }
    });
    const plans = await this.prisma.plan.findMany();
    const planById = new Map(plans.map((plan) => [plan.id, plan]));
    const header = "邮箱,余额,推广佣金,总流量(GB),设备数限制,剩余流量(GB),套餐到期时间,订阅计划,订阅地址";
    const lines = users.map((user) => {
      const plan = user.planId ? planById.get(user.planId) : null;
      const balance = (user.balance / 100).toFixed(2);
      const commission = (user.commissionBalance / 100).toFixed(2);
      const transferGb = (Number(user.transferEnable) / GIB).toFixed(2);
      const remainGb = Math.max(
        Number(user.transferEnable) - Number(user.u) - Number(user.d),
        0
      );
      const expire =
        user.expiredAt === null
          ? "长期有效"
          : new Date(Number(user.expiredAt) * 1000).toISOString().replace("T", " ").slice(0, 19);
      const planName = plan?.name ?? "无订阅";
      const sub = subscribeUrl(user.token, this.settings);
      return `${user.email},${balance},${commission},${transferGb},${user.deviceLimit ?? ""},${(remainGb / GIB).toFixed(2)},${expire},${planName},${sub}`;
    });
    return {
      data: true,
      buffer: `﻿${header}\r\n${lines.join("\r\n")}`,
      code: 200,
      message: ""
    };
  }

  @Post("sendMail")
  async sendMail(@Body() body: Record<string, unknown>) {
    const where = await this.buildFilterWhere(body.filter);
    const users = await this.prisma.user.findMany({
      where,
      select: { id: true, email: true }
    });
    const subject = String(body.subject ?? "");
    const content = String(body.content ?? "");
    if (!subject || !content) return dataResponse(false);
    await Promise.all(
      users.map((user) =>
        this.mail.send({
          to: user.email,
          subject,
          templateName: "notify",
          templateValue: { content }
        })
      )
    );
    return dataResponse(true);
  }

  private async fetchWithQuery(query: Record<string, unknown>) {
    const current = Math.max(1, firstQueryNumber(query.current, 1));
    const pageSize = Math.max(1, Math.min(500, firstQueryNumber(query.pageSize, 10)));
    const skip = (current - 1) * pageSize;
    const sortField = parseSortField(query.sort);
    const sortType = parseSortType(query.sort_type);
    const where = await this.buildFilterWhere(query.filter);

    const [users, total, plans] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { [sortField]: sortType } as Prisma.UserOrderByWithRelationInput,
        skip,
        take: pageSize
      }),
      this.prisma.user.count({ where }),
      this.prisma.plan.findMany()
    ]);
    const planById = new Map(plans.map((plan) => [plan.id, plan]));
    const enriched = await Promise.all(
      users.map(async (user) =>
        userToLegacy(user, planById.get(user.planId ?? 0), null, {
          aliveIp: await aliveIpCount(this.prisma, user.id),
          subscribeUrl: subscribeUrl(user.token, this.settings)
        })
      )
    );
    return {
      data: toJsonSafe(enriched),
      total,
      code: 200,
      message: ""
    };
  }

  private async planAssignmentData(planIdValue: unknown) {
    if (planIdValue === undefined) return {};
    const planId = asNullableNumber(planIdValue);
    if (!planId) {
      return {
        planId: null,
        groupId: null
      };
    }
    const plan = await this.prisma.plan.findUniqueOrThrow({ where: { id: planId } });
    return {
      planId: plan.id,
      groupId: plan.groupId,
      transferEnable: BigInt(Math.round(plan.transferEnable * GIB)),
      deviceLimit: plan.deviceLimit,
      speedLimit: plan.speedLimit
    };
  }

  private async cascadeDeleteUser(id: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.userSession.deleteMany({ where: { userId: id } });
      await tx.order.deleteMany({ where: { userId: id } });
      await tx.inviteCode.deleteMany({ where: { userId: id } });
      const tickets = await tx.ticket.findMany({
        where: { userId: id },
        select: { id: true }
      });
      const ticketIds = tickets.map((ticket) => ticket.id);
      if (ticketIds.length > 0) {
        await tx.ticketMessage.deleteMany({ where: { ticketId: { in: ticketIds } } });
        await tx.ticket.deleteMany({ where: { id: { in: ticketIds } } });
      }
      await tx.user.updateMany({
        where: { inviteUserId: id },
        data: { inviteUserId: null }
      });
      await tx.user.delete({ where: { id } });
    });
  }

  private buildFilterWhere(filters: unknown): Promise<Prisma.UserWhereInput> {
    return buildUserFilterWhere(filters, {
      resolveInviteUserId: async (_condition, value) => {
        if (!value) return 0;
        const user = await this.prisma.user.findUnique({
          where: { email: value.toLowerCase() },
          select: { id: true }
        });
        return user?.id ?? 0;
      }
    });
  }
}
