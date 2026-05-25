import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { StaffGuard } from "../auth/auth.guard.js";
import { firstQueryNumber } from "../common/coercion.js";
import {
  buildUserFilterWhere,
  parseSortField,
  parseSortType
} from "../common/filter.js";
import { dataResponse, toJsonSafe } from "../common/json.js";
import { unixNow } from "../common/unix.js";
import { PrismaService } from "../database/prisma.service.js";
import { MailService } from "../mail/mail.service.js";

@Controller("staff/user")
@UseGuards(StaffGuard)
export class StaffUserController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService
  ) {}

  @Get("fetch")
  async fetch(@Query() query: Record<string, unknown>) {
    const current = Math.max(1, firstQueryNumber(query.current, 1));
    const pageSize = Math.max(1, Math.min(500, firstQueryNumber(query.pageSize, 10)));
    const skip = (current - 1) * pageSize;
    const sortField = parseSortField(query.sort);
    const sortType = parseSortType(query.sort_type);
    const baseFilter = await this.buildFilterWhere(query.filter);
    const where: Prisma.UserWhereInput = {
      AND: [baseFilter, { isAdmin: false, isStaff: false }]
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { [sortField]: sortType } as Prisma.UserOrderByWithRelationInput,
        skip,
        take: pageSize
      }),
      this.prisma.user.count({ where })
    ]);
    return { data: toJsonSafe(users), total, code: 200, message: "" };
  }

  @Get("getUserInfoById")
  async getUserInfoById(@Query() query: Record<string, unknown>) {
    const id = Number(query.id);
    const user = await this.prisma.user.findUnique({
      where: { id, isAdmin: false, isStaff: false }
    });
    return dataResponse(user);
  }

  @Post("update")
  async update(@Body() body: Record<string, unknown>) {
    const id = Number(body.id);
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target || target.isAdmin || target.isStaff) return dataResponse(false);
    const data: Prisma.UserUpdateInput = { updatedAt: unixNow() };
    if (body.remarks !== undefined) {
      data.remarks = body.remarks === null ? null : String(body.remarks);
    }
    if (body.banned !== undefined) data.banned = Boolean(body.banned);
    if (body.expired_at !== undefined) {
      const raw = body.expired_at;
      data.expiredAt =
        raw === null || raw === "" || Number(raw) <= 0 ? null : BigInt(Math.round(Number(raw)));
    }
    await this.prisma.user.update({ where: { id }, data });
    return dataResponse(true);
  }

  @Post("ban")
  async ban(@Body() body: Record<string, unknown>) {
    const baseFilter = await this.buildFilterWhere(body.filter);
    const where: Prisma.UserWhereInput = {
      AND: [baseFilter, { isAdmin: false, isStaff: false }]
    };
    const users = await this.prisma.user.findMany({ where, select: { id: true } });
    const ids = users.map((user) => user.id);
    if (ids.length === 0) return dataResponse(true);
    await Promise.all([
      this.prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { banned: true, updatedAt: unixNow() }
      }),
      this.prisma.userSession.deleteMany({ where: { userId: { in: ids } } })
    ]);
    return dataResponse(true);
  }

  @Post("sendMail")
  async sendMail(@Body() body: Record<string, unknown>) {
    const baseFilter = await this.buildFilterWhere(body.filter);
    const where: Prisma.UserWhereInput = {
      AND: [baseFilter, { isAdmin: false, isStaff: false }]
    };
    const users = await this.prisma.user.findMany({ where, select: { email: true } });
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
