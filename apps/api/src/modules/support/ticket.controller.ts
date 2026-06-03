import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { AdminGuard, AuthenticatedGuard, StaffGuard } from "../auth/auth.guard.js";
import { extractAuthorization } from "../auth/auth-request.js";
import { AuthService } from "../auth/auth.service.js";
import { firstQueryNumber } from "../common/coercion.js";
import { dataResponse, toJsonSafe } from "../common/json.js";
import { unixNow } from "../common/unix.js";
import { PrismaService } from "../database/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";

@Controller("user/ticket")
@UseGuards(AuthenticatedGuard)
export class UserTicketController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly settings: SettingsService
  ) {}

  @Get("fetch")
  async fetch(@Req() request: FastifyRequest, @Query() query: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const id = query.id ? Number(query.id) : null;
    if (id) {
      const ticket = await this.prisma.ticket.findUnique({ where: { id } });
      if (!ticket || ticket.userId !== me.id) return dataResponse(null);
      const messages = await this.prisma.ticketMessage.findMany({
        where: { ticketId: id },
        orderBy: { id: "asc" }
      });
      return dataResponse({
        ...ticket,
        message: messages.map((message) => ({
          id: message.id,
          ticket_id: message.ticketId,
          user_id: message.userId,
          message: message.message,
          created_at: message.createdAt,
          updated_at: message.updatedAt,
          is_me: message.userId === me.id
        }))
      });
    }
    const tickets = await this.prisma.ticket.findMany({
      where: { userId: me.id },
      orderBy: { id: "desc" }
    });
    return dataResponse(tickets);
  }

  @Post("save")
  async save(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    if (this.settings.getInt("ticket_status", 0) === 1) {
      throw new BadRequestException("工单已关闭");
    }
    const subject = String(body.subject ?? "").trim();
    const level = Number(body.level ?? 1);
    const message = String(body.message ?? "").trim();
    if (!subject || !message) throw new BadRequestException("标题和内容不能为空");

    const now = unixNow();
    const ticket = await this.prisma.ticket.create({
      data: {
        userId: me.id,
        subject,
        level,
        status: 0,
        replyStatus: 1,
        createdAt: now,
        updatedAt: now
      }
    });
    await this.prisma.ticketMessage.create({
      data: {
        userId: me.id,
        ticketId: ticket.id,
        message,
        createdAt: now,
        updatedAt: now
      }
    });
    return dataResponse(true);
  }

  @Post("reply")
  async reply(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const id = Number(body.id);
    const message = String(body.message ?? "").trim();
    if (!id || !message) throw new BadRequestException("缺少参数");
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket || ticket.userId !== me.id) throw new BadRequestException("工单不存在");
    if (ticket.status === 1) throw new BadRequestException("工单已关闭");
    if (ticket.replyStatus === 1) throw new BadRequestException("请等待管理员回复");
    const now = unixNow();
    await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: { userId: me.id, ticketId: id, message, createdAt: now, updatedAt: now }
      }),
      this.prisma.ticket.update({ where: { id }, data: { replyStatus: 1, updatedAt: now } })
    ]);
    return dataResponse(true);
  }

  @Post("close")
  async close(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const id = Number(body.id);
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket || ticket.userId !== me.id) throw new BadRequestException("工单不存在");
    await this.prisma.ticket.update({
      where: { id },
      data: { status: 1, updatedAt: unixNow() }
    });
    return dataResponse(true);
  }

  @Post("withdraw")
  async withdraw(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    if (this.settings.getBool("withdraw_close_enable")) {
      throw new BadRequestException("提现功能已关闭");
    }
    const limit = this.settings.getInt("commission_withdraw_limit", 100) * 100;
    const account = String(body.withdraw_account ?? "").trim();
    const method = String(body.withdraw_method ?? "USDT");
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (user.commissionBalance < limit) {
      throw new BadRequestException("提现金额低于最低门槛");
    }
    if (!account) throw new BadRequestException("提现账户不能为空");

    const now = unixNow();
    await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          userId: me.id,
          subject: `[提现申请] ${method}`,
          level: 1,
          status: 0,
          replyStatus: 1,
          createdAt: now,
          updatedAt: now
        }
      });
      await tx.ticketMessage.create({
        data: {
          userId: me.id,
          ticketId: ticket.id,
          message: `提现方式: ${method}\n提现账户: ${account}\n提现金额: ¥${(user.commissionBalance / 100).toFixed(2)}`,
          createdAt: now,
          updatedAt: now
        }
      });
    });
    return dataResponse(true);
  }
}

@Controller([":adminPath/ticket", "staff/ticket"])
@UseGuards(StaffGuard)
export class StaffTicketController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  @Get("fetch")
  async fetch(@Query() query: Record<string, unknown>) {
    const id = query.id ? Number(query.id) : null;
    if (id) {
      const [ticket, messages] = await Promise.all([
        this.prisma.ticket.findUnique({ where: { id } }),
        this.prisma.ticketMessage.findMany({
          where: { ticketId: id },
          orderBy: { id: "asc" }
        })
      ]);
      return dataResponse({ ...ticket, message: messages });
    }
    const current = Math.max(1, firstQueryNumber(query.current, 1));
    const pageSize = Math.max(1, Math.min(50, firstQueryNumber(query.pageSize, 10)));
    const where: Prisma.TicketWhereInput = {};
    if (query.status !== undefined && query.status !== "") {
      where.status = Number(query.status);
    }
    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (current - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.ticket.count({ where })
    ]);
    // Ticket has a scalar user_id but no Prisma relation, so join manually to
    // show the submitter's email in the admin list.
    const userIds = Array.from(new Set(tickets.map((t) => t.userId)));
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true }
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    return {
      data: toJsonSafe(
        tickets.map((t) => ({ ...t, user: userById.get(t.userId) ?? null }))
      ),
      total,
      code: 200,
      message: ""
    };
  }

  @Post("reply")
  async reply(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const id = Number(body.id);
    const message = String(body.message ?? "").trim();
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket || !message) return dataResponse(false);
    const now = unixNow();
    await this.prisma.$transaction([
      this.prisma.ticketMessage.create({
        data: { userId: me.id, ticketId: id, message, createdAt: now, updatedAt: now }
      }),
      this.prisma.ticket.update({ where: { id }, data: { replyStatus: 0, updatedAt: now } })
    ]);
    return dataResponse(true);
  }

  @Post("close")
  async close(@Body() body: Record<string, unknown>) {
    const id = Number(body.id);
    await this.prisma.ticket.update({
      where: { id },
      data: { status: 1, updatedAt: unixNow() }
    });
    return dataResponse(true);
  }
}

const GIB = 1024 ** 3;

function dayStart(): number {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function monthStart(offset = 0): number {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return Math.floor(date.getTime() / 1000);
}

@Controller(":adminPath/stat")
@UseGuards(AdminGuard)
export class AdminStatController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * V2Board's overview dashboard tiles. Field shape must match exactly —
   * the React panel reads these keys directly.
   */
  @Get("getOverride")
  async getOverride() {
    const now = unixNow();
    const today = dayStart();
    const month = monthStart();
    const lastMonth = monthStart(-1);
    const tenMinutesAgo = now - 600;
    const [
      onlineUser,
      monthIncome,
      monthRegister,
      dayRegister,
      ticketPending,
      commissionPending,
      dayIncome,
      lastMonthIncome,
      commissionMonth,
      commissionLastMonth
    ] = await Promise.all([
      this.prisma.user.count({ where: { t: { gte: tenMinutesAgo } } }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: month, lt: now },
          status: { notIn: [0, 2] }
        }
      }),
      this.prisma.user.count({ where: { createdAt: { gte: month, lt: now } } }),
      this.prisma.user.count({ where: { createdAt: { gte: today, lt: now } } }),
      this.prisma.ticket.count({ where: { status: 0, replyStatus: 0 } }),
      this.prisma.order.count({
        where: {
          commissionStatus: 0,
          inviteUserId: { not: null },
          status: { notIn: [0, 2] },
          commissionBalance: { gt: 0 }
        }
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: today, lt: now }, status: { notIn: [0, 2] } }
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: lastMonth, lt: month },
          status: { notIn: [0, 2] }
        }
      }),
      this.prisma.commissionLog.aggregate({
        _sum: { getAmount: true },
        where: { createdAt: { gte: month, lt: now } }
      }),
      this.prisma.commissionLog.aggregate({
        _sum: { getAmount: true },
        where: { createdAt: { gte: lastMonth, lt: month } }
      })
    ]);
    return dataResponse({
      online_user: onlineUser,
      month_income: monthIncome._sum.totalAmount ?? 0,
      month_register_total: monthRegister,
      day_register_total: dayRegister,
      ticket_pending_total: ticketPending,
      commission_pending_total: commissionPending,
      day_income: dayIncome._sum.totalAmount ?? 0,
      last_month_income: lastMonthIncome._sum.totalAmount ?? 0,
      commission_month_payout: commissionMonth._sum.getAmount ?? 0,
      commission_last_month_payout: commissionLastMonth._sum.getAmount ?? 0
    });
  }

  /**
   * Daily aggregate report (last 31 days) — graphed on the admin home.
   */
  @Get("getOrder")
  async getOrder() {
    const records = await this.prisma.stat.findMany({
      where: { recordType: "d" },
      orderBy: { recordAt: "desc" },
      take: 31
    });
    const result: Array<{ type: string; date: string; value: number }> = [];
    for (const stat of records) {
      const date = new Date(stat.recordAt * 1000);
      const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      result.push({ type: "注册人数", date: dateStr, value: stat.registerCount });
      result.push({ type: "收款金额", date: dateStr, value: stat.paidTotal / 100 });
      result.push({ type: "收款笔数", date: dateStr, value: stat.paidCount });
      result.push({
        type: "佣金金额(已发放)",
        date: dateStr,
        value: stat.commissionTotal / 100
      });
      result.push({
        type: "佣金笔数(已发放)",
        date: dateStr,
        value: stat.commissionCount
      });
    }
    return dataResponse(result.reverse());
  }

  @Get("getServerLastRank")
  async getServerLastRank() {
    return this.serverRank(dayStart() - 86400, dayStart());
  }

  @Get("getServerTodayRank")
  async getServerTodayRank() {
    return this.serverRank(dayStart(), unixNow());
  }

  @Get("getUserTodayRank")
  async getUserTodayRank() {
    return this.userRank(dayStart(), unixNow());
  }

  @Get("getUserLastRank")
  async getUserLastRank() {
    return this.userRank(dayStart() - 86400, dayStart());
  }

  /**
   * V2Board exposes both /stat/getStat (legacy alias) and /stat/getRanking,
   * /stat/getStatRecord. None of these have a concrete PHP implementation
   * in the latest controller, so they collapse to safe defaults that don't
   * break the dashboard charts.
   */
  @Get("getStat")
  async getStat() {
    return this.getOverride();
  }

  @Get("getRanking")
  async getRanking() {
    return dataResponse([]);
  }

  @Get("getStatRecord")
  async getStatRecord() {
    return dataResponse([]);
  }

  @Get("getStatUser")
  async getStatUser(@Query() query: Record<string, unknown>) {
    const userId = Number(query.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return { data: [], total: 0, code: 200, message: "" };
    }
    const current = Math.max(1, firstQueryNumber(query.current, 1));
    const pageSize = Math.max(1, Math.min(500, firstQueryNumber(query.pageSize, 10)));
    const [records, total] = await Promise.all([
      this.prisma.statUser.findMany({
        where: { userId },
        orderBy: { recordAt: "desc" },
        skip: (current - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.statUser.count({ where: { userId } })
    ]);
    return { data: toJsonSafe(records), total, code: 200, message: "" };
  }

  private async serverRank(startAt: number, endAt: number) {
    const records = await this.prisma.statServer.findMany({
      where: { recordAt: { gte: startAt, lt: endAt }, recordType: "d" },
      take: 15
    });
    const grouped = new Map<string, { serverId: number; serverType: string; total: bigint }>();
    for (const row of records) {
      const key = `${row.serverType}#${row.serverId}`;
      const current = grouped.get(key);
      const total = row.u + row.d;
      if (current) {
        current.total += total;
      } else {
        grouped.set(key, { serverId: row.serverId, serverType: row.serverType, total });
      }
    }
    const nodes = await this.prisma.serverNode.findMany({
      where: { id: { in: Array.from(grouped.values()).map((row) => row.serverId) } },
      select: { id: true, name: true }
    });
    const nameById = new Map(nodes.map((node) => [node.id, node.name]));
    const sorted = Array.from(grouped.values())
      .map((row) => ({
        server_id: row.serverId,
        server_type: row.serverType,
        server_name: nameById.get(row.serverId) ?? "",
        u: 0,
        d: 0,
        total: Number(row.total) / GIB
      }))
      .sort((a, b) => b.total - a.total);
    return dataResponse(sorted);
  }

  private async userRank(startAt: number, endAt: number) {
    const records = await this.prisma.statUser.findMany({
      where: { recordAt: { gte: startAt, lt: endAt }, recordType: "d" },
      take: 30
    });
    const grouped = new Map<number, { userId: number; total: number }>();
    for (const row of records) {
      const rate = Number(row.serverRate);
      const contrib = (Number(row.u + row.d) * rate) / GIB;
      const current = grouped.get(row.userId);
      if (current) current.total += contrib;
      else grouped.set(row.userId, { userId: row.userId, total: contrib });
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(grouped.keys()) } },
      select: { id: true, email: true }
    });
    const emailById = new Map(users.map((user) => [user.id, user.email]));
    const sorted = Array.from(grouped.values())
      .map((row) => ({
        user_id: row.userId,
        email: emailById.get(row.userId) ?? "null",
        total: row.total
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
    return dataResponse(sorted);
  }
}

@Controller("user/stat")
@UseGuards(AuthenticatedGuard)
export class UserStatController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  @Get("getTrafficLog")
  async getTrafficLog(@Req() request: FastifyRequest) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    // V2Board returns every row from the start of the current month, ordered
    // newest-first. The user-side traffic page does its own grouping by
    // date; truncating to N rows breaks the per-day totals.
    const monthStart = (() => {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      return Math.floor(d.getTime() / 1000);
    })();
    const records = await this.prisma.statUser.findMany({
      where: { userId: me.id, recordAt: { gte: monthStart } },
      orderBy: { recordAt: "desc" }
    });
    return dataResponse(
      records.map((row) => ({
        record_at: row.recordAt,
        u: row.u,
        d: row.d,
        user_id: row.userId,
        server_rate: row.serverRate
      }))
    );
  }
}
