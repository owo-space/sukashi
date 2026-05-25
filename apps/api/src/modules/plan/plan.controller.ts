import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Plan } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { AdminGuard, AuthenticatedGuard, StaffGuard } from "../auth/auth.guard.js";
import { extractAuthorization } from "../auth/auth-request.js";
import { AuthService } from "../auth/auth.service.js";
import { asBoolean, asNullableNumber } from "../common/coercion.js";
import { dataResponse } from "../common/json.js";
import { unixNow } from "../common/unix.js";
import { PrismaService } from "../database/prisma.service.js";

const GIB = 1024 ** 3;

function asPlanTransfer(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  return Math.round(Number(value));
}

function planToLegacy(plan: Plan, count = 0) {
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
    updated_at: plan.updatedAt,
    count
  };
}

@Controller()
export class PlanController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  /**
   * User plan list. Mirrors V2Board's two distinct access rules:
   *  - LIST (no id): return ONLY plans where show=1, regardless of which
   *    plan the user owns. Hidden plans must never appear in the buy page.
   *  - SINGLE (id query): allow show=1, OR (renew=1 AND user owns it).
   *    A retired plan (renew=0) is hidden even from its current owner.
   *  - capacity_limit: subtract active user count from the configured limit
   *    so a sold-out plan reports 0 remaining (the frontend disables the
   *    buy button accordingly).
   */
  @Get("user/plan/fetch")
  @UseGuards(AuthenticatedGuard)
  async userFetch(@Query() query: Record<string, unknown>, @Req() request: FastifyRequest) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    const requestedId = asNullableNumber(query.id);

    const counts = await this.prisma.user.groupBy({
      by: ["planId"],
      _count: { _all: true },
      where: { planId: { not: null } }
    });
    const countByPlan = new Map(counts.map((item) => [item.planId, item._count._all]));

    const enrich = (plan: Plan) => {
      const used = countByPlan.get(plan.id) ?? 0;
      const capacity = plan.capacityLimit;
      const remaining = capacity === null ? null : Math.max(capacity - used, 0);
      return {
        ...planToLegacy(plan, used),
        capacity_limit: remaining
      };
    };

    if (requestedId) {
      const me = await this.prisma.user.findUniqueOrThrow({
        where: { id: authUser.id },
        select: { planId: true }
      });
      const plan = await this.prisma.plan.findUnique({ where: { id: requestedId } });
      if (!plan) return dataResponse(null);
      const ownedByUser = plan.id === me.planId;
      const visible = plan.show || (plan.renew && ownedByUser);
      if (!visible) return dataResponse(null);
      return dataResponse(enrich(plan));
    }

    const plans = await this.prisma.plan.findMany({
      where: { show: true },
      orderBy: [{ sort: "asc" }, { id: "asc" }]
    });
    return dataResponse(plans.map(enrich));
  }

  @Get("staff/plan/fetch")
  @UseGuards(StaffGuard)
  async staffFetch() {
    return this.adminFetch();
  }

  @Get(":adminPath/plan/fetch")
  @UseGuards(AdminGuard)
  async adminFetch() {
    const plans = await this.prisma.plan.findMany({
      orderBy: [{ sort: "asc" }, { id: "asc" }]
    });
    const counts = await this.prisma.user.groupBy({
      by: ["planId"],
      _count: { _all: true },
      where: { planId: { not: null } }
    });
    const countByPlan = new Map(counts.map((item) => [item.planId, item._count._all]));
    return dataResponse(
      plans.map((plan) => planToLegacy(plan, countByPlan.get(plan.id) ?? 0))
    );
  }

  @Post(":adminPath/plan/save")
  @UseGuards(AdminGuard)
  async save(@Body() body: Record<string, unknown>) {
    const now = unixNow();
    const id = asNullableNumber(body.id);
    const data = {
      groupId: Number(body.group_id ?? body.groupId ?? 0),
      transferEnable: asPlanTransfer(body.transfer_enable ?? body.transferEnable),
      deviceLimit: asNullableNumber(body.device_limit ?? body.deviceLimit),
      name: String(body.name ?? ""),
      speedLimit: asNullableNumber(body.speed_limit ?? body.speedLimit),
      show: asBoolean(body.show),
      sort: asNullableNumber(body.sort),
      renew: body.renew === undefined ? true : asBoolean(body.renew),
      content:
        body.content === undefined || body.content === null
          ? null
          : String(body.content),
      monthPrice: asNullableNumber(body.month_price ?? body.monthPrice),
      quarterPrice: asNullableNumber(body.quarter_price ?? body.quarterPrice),
      halfYearPrice: asNullableNumber(body.half_year_price ?? body.halfYearPrice),
      yearPrice: asNullableNumber(body.year_price ?? body.yearPrice),
      twoYearPrice: asNullableNumber(body.two_year_price ?? body.twoYearPrice),
      threeYearPrice: asNullableNumber(body.three_year_price ?? body.threeYearPrice),
      onetimePrice: asNullableNumber(body.onetime_price ?? body.onetimePrice),
      resetPrice: asNullableNumber(body.reset_price ?? body.resetPrice),
      resetTrafficMethod: asNullableNumber(
        body.reset_traffic_method ?? body.resetTrafficMethod
      ),
      capacityLimit: asNullableNumber(body.capacity_limit ?? body.capacityLimit),
      updatedAt: now
    };

    const plan = id
      ? await this.prisma.plan.update({ where: { id }, data })
      : await this.prisma.plan.create({
          data: {
            ...data,
            createdAt: now
          }
        });
    if (id && asBoolean(body.force_update)) {
      await this.applyPlanToUsers(plan);
    }
    return dataResponse(planToLegacy(plan));
  }

  @Post(":adminPath/plan/update")
  @UseGuards(AdminGuard)
  async update(@Body() body: Record<string, unknown>) {
    const id = Number(body.id);
    const plan = await this.prisma.plan.update({
      where: { id },
      data: {
        ...(body.group_id === undefined ? {} : { groupId: Number(body.group_id) }),
        ...(body.transfer_enable === undefined
          ? {}
          : { transferEnable: asPlanTransfer(body.transfer_enable) }),
        ...(body.device_limit === undefined
          ? {}
          : { deviceLimit: asNullableNumber(body.device_limit) }),
        ...(body.name === undefined ? {} : { name: String(body.name) }),
        ...(body.speed_limit === undefined
          ? {}
          : { speedLimit: asNullableNumber(body.speed_limit) }),
        ...(body.show === undefined ? {} : { show: asBoolean(body.show) }),
        ...(body.sort === undefined
          ? {}
          : { sort: asNullableNumber(body.sort) }),
        ...(body.renew === undefined ? {} : { renew: asBoolean(body.renew) }),
        ...(body.content === undefined
          ? {}
          : { content: body.content === null ? null : String(body.content) }),
        updatedAt: unixNow()
      }
    });
    if (asBoolean(body.force_update)) {
      await this.applyPlanToUsers(plan);
    }
    return dataResponse(planToLegacy(plan));
  }

  @Post(":adminPath/plan/drop")
  @UseGuards(AdminGuard)
  async drop(@Body() body: Record<string, unknown>) {
    await this.prisma.plan.delete({ where: { id: Number(body.id) } });
    return dataResponse(true);
  }

  @Post(":adminPath/plan/sort")
  @UseGuards(AdminGuard)
  async sort(@Body() body: Record<string, unknown>) {
    const ids = Array.isArray(body.plan_ids) ? body.plan_ids : [];
    await Promise.all(
      ids.map((id, index) =>
        this.prisma.plan.update({
          where: { id: Number(id) },
          data: {
            sort: index + 1,
            updatedAt: unixNow()
          }
        })
      )
    );
    return dataResponse(true);
  }

  private async applyPlanToUsers(plan: Plan) {
    await this.prisma.user.updateMany({
      where: { planId: plan.id },
      data: {
        groupId: plan.groupId,
        transferEnable: BigInt(Math.round(plan.transferEnable * GIB)),
        deviceLimit: plan.deviceLimit,
        speedLimit: plan.speedLimit,
        updatedAt: unixNow()
      }
    });
  }
}
