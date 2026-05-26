import {
  All,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
// All decorator already imported above for verb-agnostic endpoints.
import type { Prisma } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import { AdminGuard, AuthenticatedGuard } from "../auth/auth.guard.js";
import { extractAuthorization } from "../auth/auth-request.js";
import { AuthService } from "../auth/auth.service.js";
import { asBoolean, asNullableNumber, firstQueryNumber, firstQueryValue } from "../common/coercion.js";
import { dataResponse, toJsonSafe } from "../common/json.js";
import { randomChar } from "../common/random.js";
import { unixNow } from "../common/unix.js";
import { PrismaService } from "../database/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { CouponService } from "./coupon.service.js";
import { OrderService } from "./order.service.js";
import { PaymentService } from "./payment.service.js";

const GIB = 1024 ** 3;

@Controller("user/order")
@UseGuards(AuthenticatedGuard)
export class UserOrderController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrderService,
    private readonly payments: PaymentService,
    private readonly authService: AuthService
  ) {}

  @Get("fetch")
  async fetch(@Req() request: FastifyRequest, @Query() query: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const status = firstQueryValue(query.status);
    const where: Prisma.OrderWhereInput = { userId: me.id };
    if (status !== undefined && status !== "") where.status = Number(status);
    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    return dataResponse(orders);
  }

  @Get("detail")
  async detail(@Req() request: FastifyRequest, @Query() query: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const tradeNo = String(query.trade_no ?? "");
    if (!tradeNo) return dataResponse(null);
    const order = await this.prisma.order.findUnique({ where: { tradeNo } });
    if (!order || order.userId !== me.id) return dataResponse(null);
    const plan = await this.prisma.plan.findUnique({ where: { id: order.planId } });
    return dataResponse({ ...order, plan });
  }

  @Post("save")
  async save(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const result = await this.orders.create(me.id, {
      plan_id: body.plan_id,
      period: body.period,
      coupon_code: body.coupon_code
    });
    return dataResponse(result.order.tradeNo);
  }

  /**
   * V2Board uses GET for /user/order/check (the frontend polls it). Keep
   * POST too for clients that send the trade_no in the body.
   */
  @Get("check")
  async checkGet(@Req() request: FastifyRequest, @Query() query: Record<string, unknown>) {
    return this.check(request, query);
  }

  @Post("checkout")
  async checkout(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const tradeNo = String(body.trade_no ?? "");
    const paymentId = Number(body.method ?? body.payment_id ?? 0);
    if (!tradeNo) return dataResponse(false);
    const order = await this.prisma.order.findUnique({ where: { tradeNo } });
    if (!order || order.userId !== me.id) return dataResponse(false);
    if (order.status !== 0) return dataResponse(true);
    if (order.totalAmount <= 0) {
      await this.orders.markPaid(order.id, null);
      return dataResponse(true);
    }
    if (paymentId <= 0) return dataResponse(false);
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment || !payment.enable) return dataResponse(false);
    await this.prisma.order.update({
      where: { id: order.id },
      data: { paymentId, updatedAt: unixNow() }
    });
    // Sukashi is Stripe-only — every active payment row produces a hosted
    // Checkout Session URL that the user-side panel redirects to.
    const session = await this.payments.createCheckout(payment, order, { request });
    return dataResponse({
      type: "url",
      data: session.url
    });
  }

  @Post("check")
  async check(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const tradeNo = String(body.trade_no ?? "");
    const order = await this.prisma.order.findUnique({ where: { tradeNo } });
    if (!order || order.userId !== me.id) return dataResponse(0);
    return dataResponse(order.status);
  }

  @Post("cancel")
  async cancel(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const tradeNo = String(body.trade_no ?? "");
    return dataResponse(await this.orders.cancel(me.id, tradeNo));
  }

  @Get("getPaymentMethod")
  async getPaymentMethod() {
    const payments = await this.prisma.payment.findMany({
      where: { enable: true },
      orderBy: [{ sort: "asc" }, { id: "asc" }]
    });
    return dataResponse(
      payments.map((payment) => ({
        id: payment.id,
        name: payment.name,
        payment: payment.payment,
        icon: payment.icon
      }))
    );
  }
}

@Controller("user/coupon")
@UseGuards(AuthenticatedGuard)
export class UserCouponController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponService,
    private readonly authService: AuthService
  ) {}

  @Post("check")
  async check(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const planId = Number(body.plan_id);
    const period = String(body.period ?? "month_price");
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return dataResponse(false);
    const planPrice = Number((plan as unknown as Record<string, number | null>)[snake(period)] ?? 0);
    const result = await this.coupons.evaluate(
      String(body.code ?? ""),
      plan,
      period,
      planPrice,
      { id: me.id }
    );
    return dataResponse({
      id: result.coupon.id,
      code: result.coupon.code,
      name: result.coupon.name,
      type: result.coupon.type,
      value: result.coupon.value,
      discount_amount: result.discountAmount
    });
  }
}

function snake(period: string): string {
  return period.replace(/([A-Z])/g, "_$1").toLowerCase();
}

@Controller("user/invite")
@UseGuards(AuthenticatedGuard)
export class UserInviteController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly settings: SettingsService
  ) {}

  @Get("fetch")
  async fetch(@Req() request: FastifyRequest) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const [codes, commission] = await Promise.all([
      this.prisma.inviteCode.findMany({
        where: { userId: me.id, status: 0 },
        orderBy: { id: "desc" }
      }),
      this.prisma.commissionLog.aggregate({
        where: { inviteUserId: me.id },
        _sum: { getAmount: true },
        _count: { _all: true }
      })
    ]);
    return dataResponse({
      codes,
      stat: [
        codes.length,
        await this.prisma.user.count({ where: { inviteUserId: me.id } }),
        commission._count._all,
        commission._sum.getAmount ?? 0
      ]
    });
  }

  /**
   * V2Board uses GET (/user/invite/save). Both verbs accepted for clients
   * that POST.
   */
  @All("save")
  async save(@Req() request: FastifyRequest) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const limit = this.settings.getInt("invite_gen_limit", 5);
    const active = await this.prisma.inviteCode.count({
      where: { userId: me.id, status: 0 }
    });
    if (active >= limit) return dataResponse(false);
    await this.prisma.inviteCode.create({
      data: {
        userId: me.id,
        code: randomChar(8),
        status: 0,
        pv: 0,
        createdAt: unixNow(),
        updatedAt: unixNow()
      }
    });
    return dataResponse(true);
  }

  @Get("details")
  async details(@Req() request: FastifyRequest, @Query() query: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const current = Math.max(1, firstQueryNumber(query.current, 1));
    const pageSize = Math.max(1, Math.min(50, firstQueryNumber(query.pageSize, 10)));
    const skip = (current - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.commissionLog.findMany({
        where: { inviteUserId: me.id },
        orderBy: { id: "desc" },
        skip,
        take: pageSize
      }),
      this.prisma.commissionLog.count({ where: { inviteUserId: me.id } })
    ]);
    return { data: toJsonSafe(items), total, code: 200, message: "" };
  }
}

@Controller(":adminPath/order")
@UseGuards(AdminGuard)
export class AdminOrderController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrderService
  ) {}

  @Get("fetch")
  async fetch(@Query() query: Record<string, unknown>) {
    const current = Math.max(1, firstQueryNumber(query.current, 1));
    const pageSize = Math.max(1, Math.min(500, firstQueryNumber(query.pageSize, 10)));
    const skip = (current - 1) * pageSize;
    const where: Prisma.OrderWhereInput = {};
    const filter = (query.filter ?? []) as Array<Record<string, unknown>>;
    if (Array.isArray(filter)) {
      for (const raw of filter) {
        const key = String(raw.key ?? "");
        const value = raw.value;
        if (!key || value === undefined || value === "") continue;
        if (key === "user_id") where.userId = Number(value);
        if (key === "trade_no") where.tradeNo = String(value);
        if (key === "status") where.status = Number(value);
      }
    }
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { id: "desc" },
        skip,
        take: pageSize
      }),
      this.prisma.order.count({ where })
    ]);
    return { data: toJsonSafe(orders), total, code: 200, message: "" };
  }

  @All("detail")
  async detail(@Query() query: Record<string, unknown>, @Body() body?: Record<string, unknown>) {
    const tradeNo = String(query.trade_no ?? body?.trade_no ?? "");
    const order = await this.prisma.order.findUnique({ where: { tradeNo } });
    return dataResponse(order);
  }

  @Post("paid")
  async paid(@Body() body: Record<string, unknown>) {
    const order = await this.prisma.order.findUnique({ where: { tradeNo: String(body.trade_no ?? "") } });
    if (!order) return dataResponse(false);
    return dataResponse(await this.orders.markPaid(order.id, "admin"));
  }

  @Post("cancel")
  async cancel(@Body() body: Record<string, unknown>) {
    const order = await this.prisma.order.findUnique({ where: { tradeNo: String(body.trade_no ?? "") } });
    if (!order) return dataResponse(false);
    if (order.status !== 0) return dataResponse(false);
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 2, updatedAt: unixNow() }
    });
    return dataResponse(true);
  }

  @Post("update")
  async update(@Body() body: Record<string, unknown>) {
    const tradeNo = String(body.trade_no ?? "");
    if (!tradeNo) return dataResponse(false);
    const data: Prisma.OrderUpdateInput = { updatedAt: unixNow() };
    if (body.commission_status !== undefined) data.commissionStatus = Number(body.commission_status);
    if (body.actual_commission_balance !== undefined) {
      data.actualCommissionBalance = asNullableNumber(body.actual_commission_balance);
    }
    await this.prisma.order.update({ where: { tradeNo }, data });
    return dataResponse(true);
  }

  @Post("assign")
  async assign(@Body() body: Record<string, unknown>) {
    const tradeNo = String(body.trade_no ?? "");
    const userId = Number(body.user_id);
    if (!tradeNo || !userId) return dataResponse(false);
    await this.prisma.order.update({
      where: { tradeNo },
      data: { userId, updatedAt: unixNow() }
    });
    return dataResponse(true);
  }
}

@Controller(":adminPath/coupon")
@UseGuards(AdminGuard)
export class AdminCouponController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("fetch")
  async fetch(@Query() query: Record<string, unknown>) {
    const current = Math.max(1, firstQueryNumber(query.current, 1));
    const pageSize = Math.max(1, Math.min(500, firstQueryNumber(query.pageSize, 10)));
    const [items, total] = await Promise.all([
      this.prisma.coupon.findMany({
        orderBy: { id: "desc" },
        skip: (current - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.coupon.count()
    ]);
    return { data: toJsonSafe(items), total, code: 200, message: "" };
  }

  @Post("generate")
  async generate(@Body() body: Record<string, unknown>) {
    const generateCount = Math.max(1, Number(body.generate_count ?? 1));
    const codes = Array.isArray(body.code) && body.code.length > 0 ? body.code.map(String) : [];
    const now = unixNow();
    const data = {
      name: String(body.name ?? "Coupon"),
      type: Number(body.type ?? 1),
      value: Number(body.value ?? 0),
      show: asBoolean(body.show),
      limitUse: asNullableNumber(body.limit_use),
      limitUseWithUser: asNullableNumber(body.limit_use_with_user),
      limitPlanIds: body.limit_plan_ids ? JSON.stringify(body.limit_plan_ids) : null,
      limitPeriod: body.limit_period ? JSON.stringify(body.limit_period) : null,
      startedAt: Number(body.started_at ?? now),
      endedAt: Number(body.ended_at ?? now + 365 * 86400),
      createdAt: now,
      updatedAt: now
    };
    if (codes.length > 0) {
      await this.prisma.coupon.createMany({
        data: codes.map((code) => ({ ...data, code }))
      });
    } else {
      await this.prisma.coupon.createMany({
        data: Array.from({ length: generateCount }, () => ({
          ...data,
          code: randomChar(10).toUpperCase()
        }))
      });
    }
    return dataResponse(true);
  }

  @Post("drop")
  async drop(@Body() body: Record<string, unknown>) {
    await this.prisma.coupon.delete({ where: { id: Number(body.id) } });
    return dataResponse(true);
  }

  @Post("show")
  async show(@Body() body: Record<string, unknown>) {
    await this.prisma.coupon.update({
      where: { id: Number(body.id) },
      data: { show: asBoolean(body.show), updatedAt: unixNow() }
    });
    return dataResponse(true);
  }
}

@Controller(":adminPath/payment")
@UseGuards(AdminGuard)
export class AdminPaymentController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("fetch")
  async fetch() {
    const payments = await this.prisma.payment.findMany({
      orderBy: [{ sort: "asc" }, { id: "asc" }]
    });
    return dataResponse(payments);
  }

  /**
   * Sukashi is intentionally Stripe-only. The legacy V2Board panel sends
   * the list as `[{name}, ...]`; returning a single item makes the admin
   * "Add Payment" dropdown auto-select Stripe so the form schema below
   * always matches.
   */
  @Get("getPaymentMethods")
  async getPaymentMethods() {
    return dataResponse([{ name: "Stripe" }]);
  }

  @All("getPaymentForm")
  async getPaymentForm(
    @Query() query: Record<string, unknown>,
    @Body() body?: Record<string, unknown>
  ) {
    // V2Board's admin JS posts `payment[name]=Stripe` as
    // application/x-www-form-urlencoded. Fastify's default qs parser keeps
    // the brackets in the key, so we accept all four spellings the panel
    // might emit.
    const name = String(
      query.name ??
        body?.name ??
        (body && typeof body.payment === "object" && body.payment !== null
          ? (body.payment as { name?: unknown }).name
          : undefined) ??
        body?.["payment[name]"] ??
        ""
    );
    if (name !== "Stripe") {
      // Anything other than Stripe is intentionally unsupported — return
      // an empty schema so the admin doesn't see a stale Alipay/EPay form.
      return dataResponse({});
    }
    return dataResponse({
      stripe_public_key: {
        label: "Stripe Publishable Key (pk_...)",
        type: "input",
        description: "From dashboard.stripe.com → Developers → API keys"
      },
      stripe_secret_key: {
        label: "Stripe Secret Key (sk_...)",
        type: "input",
        description: "Use a restricted key in production"
      },
      stripe_webhook_secret: {
        label: "Webhook Signing Secret (whsec_...)",
        type: "input",
        description:
          "Point Stripe webhook at https://<your-host>/api/v1/guest/payment/notify/Stripe/<payment-uuid> and copy the signing secret it gives you"
      },
      currency: {
        label: "Currency (lowercase ISO 4217)",
        type: "input",
        description: "e.g. usd, hkd, cny. Defaults to usd if blank."
      }
    });
  }

  @Post("save")
  async save(@Body() body: Record<string, unknown>) {
    const now = unixNow();
    const id = asNullableNumber(body.id);
    // Sukashi is Stripe-only. Reject anything else so the admin can't even
    // accidentally persist a legacy provider name like EPay/Alipay.
    const providerRaw = String(body.payment ?? "Stripe");
    if (providerRaw !== "Stripe") {
      return dataResponse(false);
    }
    const data = {
      uuid: String(body.uuid ?? randomChar(16)),
      payment: "Stripe",
      name: String(body.name ?? "Payment"),
      icon: body.icon ? String(body.icon) : null,
      config: (body.config ?? {}) as Prisma.InputJsonValue,
      notifyDomain: body.notify_domain ? String(body.notify_domain) : null,
      handlingFeeFixed: asNullableNumber(body.handling_fee_fixed),
      handlingFeePercent:
        body.handling_fee_percent === undefined || body.handling_fee_percent === null
          ? null
          : String(body.handling_fee_percent),
      enable: asBoolean(body.enable),
      sort: asNullableNumber(body.sort),
      updatedAt: now
    };
    if (id) {
      await this.prisma.payment.update({ where: { id }, data });
    } else {
      await this.prisma.payment.create({ data: { ...data, createdAt: now } });
    }
    return dataResponse(true);
  }

  @Post("drop")
  async drop(@Body() body: Record<string, unknown>) {
    await this.prisma.payment.delete({ where: { id: Number(body.id) } });
    return dataResponse(true);
  }

  @Post("show")
  async show(@Body() body: Record<string, unknown>) {
    await this.prisma.payment.update({
      where: { id: Number(body.id) },
      data: { enable: asBoolean(body.show), updatedAt: unixNow() }
    });
    return dataResponse(true);
  }

  @Post("sort")
  async sort(@Body() body: Record<string, unknown>) {
    const ids = Array.isArray(body.payment_ids) ? body.payment_ids : [];
    await Promise.all(
      ids.map((id, index) =>
        this.prisma.payment.update({
          where: { id: Number(id) },
          data: { sort: index + 1, updatedAt: unixNow() }
        })
      )
    );
    return dataResponse(true);
  }
}

@Controller("guest/payment")
export class GuestPaymentController {
  constructor(private readonly payments: PaymentService) {}

  /**
   * Stripe webhook entry. `method` is informational (we only support
   * Stripe); `paymentId` is the v2_payment.uuid — Stripe is configured
   * to hit `https://<host>/api/v1/guest/payment/notify/Stripe/<uuid>`.
   *
   * The raw request body (Buffer) is captured by the JSON content-type
   * parser in main.ts so we can run `stripe.webhooks.constructEvent`
   * against the exact bytes Stripe signed.
   */
  @All("notify/:method/:paymentId")
  async notify(
    @Param("paymentId") paymentId: string,
    @Req() request: FastifyRequest
  ) {
    const rawBody =
      (request as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.alloc(0);
    return this.payments.notify(paymentId, {
      rawBody,
      headers: request.headers as Record<string, unknown>
    });
  }
}

@Controller(":adminPath/giftcard")
@UseGuards(AdminGuard)
export class AdminGiftcardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("fetch")
  async fetch(@Query() query: Record<string, unknown>) {
    const current = Math.max(1, firstQueryNumber(query.current, 1));
    const pageSize = Math.max(1, Math.min(500, firstQueryNumber(query.pageSize, 10)));
    const [items, total] = await Promise.all([
      this.prisma.giftcard.findMany({
        orderBy: { id: "desc" },
        skip: (current - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.giftcard.count()
    ]);
    return { data: toJsonSafe(items), total, code: 200, message: "" };
  }

  @Post("generate")
  async generate(@Body() body: Record<string, unknown>) {
    const count = Math.max(1, Number(body.generate_count ?? 1));
    const now = unixNow();
    const data = {
      name: String(body.name ?? "Giftcard"),
      type: Number(body.type ?? 1),
      value: asNullableNumber(body.value),
      planId: asNullableNumber(body.plan_id),
      limitUse: asNullableNumber(body.limit_use),
      startedAt: Number(body.started_at ?? now),
      endedAt: Number(body.ended_at ?? now + 365 * 86400),
      createdAt: now,
      updatedAt: now
    };
    await this.prisma.giftcard.createMany({
      data: Array.from({ length: count }, () => ({
        ...data,
        code: randomChar(12).toUpperCase()
      }))
    });
    return dataResponse(true);
  }

  @Post("drop")
  async drop(@Body() body: Record<string, unknown>) {
    await this.prisma.giftcard.delete({ where: { id: Number(body.id) } });
    return dataResponse(true);
  }
}

@Controller("user")
@UseGuards(AuthenticatedGuard)
export class UserGiftcardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService
  ) {}

  @Post("redeemgiftcard")
  async redeem(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!code) return dataResponse(false);
    const giftcard = await this.prisma.giftcard.findFirst({ where: { code } });
    if (!giftcard) return dataResponse(false);
    const now = unixNow();
    if (giftcard.startedAt > now || (giftcard.endedAt && giftcard.endedAt < now)) {
      return dataResponse(false);
    }
    const used = giftcard.usedUserIds ? giftcard.usedUserIds.split(",").filter(Boolean) : [];
    if (used.includes(String(me.id))) return dataResponse(false);
    if (giftcard.limitUse !== null && used.length >= giftcard.limitUse) return dataResponse(false);

    if (giftcard.type === 1 && giftcard.value) {
      // balance top-up
      await this.prisma.user.update({
        where: { id: me.id },
        data: { balance: { increment: giftcard.value }, updatedAt: now }
      });
    } else if (giftcard.type === 2 && giftcard.planId) {
      // plan grant — extend by 30 days from now (V2Board's default)
      const plan = await this.prisma.plan.findUnique({ where: { id: giftcard.planId } });
      if (!plan) return dataResponse(false);
      const me2 = await this.prisma.user.findUniqueOrThrow({ where: { id: me.id } });
      const base =
        me2.planId === plan.id && me2.expiredAt !== null && Number(me2.expiredAt) > now
          ? Number(me2.expiredAt)
          : now;
      await this.prisma.user.update({
        where: { id: me.id },
        data: {
          planId: plan.id,
          groupId: plan.groupId,
          transferEnable: BigInt(Math.round(plan.transferEnable * GIB)),
          deviceLimit: plan.deviceLimit,
          speedLimit: plan.speedLimit,
          expiredAt: BigInt(base + 30 * 86400),
          updatedAt: now
        }
      });
    } else {
      return dataResponse(false);
    }

    await this.prisma.giftcard.update({
      where: { id: giftcard.id },
      data: {
        usedUserIds: [...used, String(me.id)].join(","),
        updatedAt: now
      }
    });
    return dataResponse(true);
  }

  @Post("newPeriod")
  async newPeriod(@Req() request: FastifyRequest) {
    const me = await this.authService.requireUser(extractAuthorization(request));
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (user.planId === null) return dataResponse(false);
    // Just reset traffic counters; user_id, plan_id, etc. unchanged.
    await this.prisma.user.update({
      where: { id: me.id },
      data: {
        u: BigInt(0),
        d: BigInt(0),
        updatedAt: unixNow()
      }
    });
    return dataResponse(true);
  }
}
