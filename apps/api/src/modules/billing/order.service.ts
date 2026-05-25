import { BadRequestException, Injectable } from "@nestjs/common";
import type { Order, Plan, User } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { generateOrderNo } from "../common/random.js";
import { unixNow } from "../common/unix.js";
import { SettingsService } from "../settings/settings.service.js";
import { CouponService } from "./coupon.service.js";

const PERIODS: Record<string, { months: number; priceField: keyof Plan }> = {
  month_price: { months: 1, priceField: "monthPrice" },
  quarter_price: { months: 3, priceField: "quarterPrice" },
  half_year_price: { months: 6, priceField: "halfYearPrice" },
  year_price: { months: 12, priceField: "yearPrice" },
  two_year_price: { months: 24, priceField: "twoYearPrice" },
  three_year_price: { months: 36, priceField: "threeYearPrice" },
  onetime_price: { months: 0, priceField: "onetimePrice" },
  reset_price: { months: 0, priceField: "resetPrice" }
};

const GIB = 1024 ** 3;

type OrderType = 1 | 2 | 3 | 4; // 1=new, 2=renew, 3=change/upgrade, 4=reset traffic

export type CreateOrderResult = {
  order: Order;
  payable: number;
};

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly coupons: CouponService
  ) {}

  async create(
    userId: number,
    input: { plan_id: unknown; period: unknown; coupon_code?: unknown }
  ): Promise<CreateOrderResult> {
    const planId = Number(input.plan_id);
    const period = String(input.period ?? "");
    if (!Number.isInteger(planId) || planId <= 0 || !period) {
      throw new BadRequestException("订单参数错误");
    }
    const spec = PERIODS[period];
    if (!spec) throw new BadRequestException("不支持的购买周期");

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new BadRequestException("订阅计划不存在");
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException("用户不存在");

    const price = Number(plan[spec.priceField] ?? 0);
    if (!price) throw new BadRequestException("该计划暂不可购买");
    if (period === "reset_price" && (user.planId !== plan.id || user.expiredAt === null)) {
      throw new BadRequestException("仅当前订阅可重置流量");
    }
    if (plan.capacityLimit !== null && period !== "reset_price") {
      const usedCount = await this.prisma.user.count({ where: { planId: plan.id } });
      if (usedCount >= plan.capacityLimit) {
        throw new BadRequestException("订阅计划已售罄");
      }
    }

    const orderType: OrderType = this.classifyOrderType(user, plan, period);
    if (orderType === 3 && !this.settings.getBool("plan_change_enable", true)) {
      throw new BadRequestException("当前不支持更换订阅");
    }

    const now = unixNow();
    const surplusAmount =
      orderType === 3 && this.settings.getBool("surplus_enable", true)
        ? await this.calculateSurplusAmount(user)
        : 0;
    const totalAmount = price;

    let discountAmount = 0;
    let couponId: number | null = null;
    if (input.coupon_code) {
      const evaluation = await this.coupons.evaluate(
        String(input.coupon_code),
        plan,
        period,
        totalAmount,
        user
      );
      discountAmount = evaluation.discountAmount;
      couponId = evaluation.coupon.id;
    }

    const afterDiscount = Math.max(totalAmount - discountAmount - surplusAmount, 0);
    const balanceAmount = Math.min(user.balance, afterDiscount);
    const payable = afterDiscount - balanceAmount;

    const order = await this.prisma.order.create({
      data: {
        userId,
        planId: plan.id,
        couponId,
        type: orderType,
        period,
        tradeNo: generateOrderNo(),
        totalAmount: payable,
        discountAmount: discountAmount || null,
        surplusAmount: surplusAmount || null,
        balanceAmount: balanceAmount || null,
        inviteUserId: user.inviteUserId,
        status: payable === 0 ? 0 : 0, // status set below if free
        createdAt: now,
        updatedAt: now
      }
    });

    if (balanceAmount > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: balanceAmount } }
      });
    }

    if (payable === 0) {
      await this.markPaid(order.id, "balance");
      return { order: await this.prisma.order.findUniqueOrThrow({ where: { id: order.id } }), payable };
    }

    return { order, payable };
  }

  async cancel(userId: number, tradeNo: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({ where: { tradeNo } });
    if (!order || order.userId !== userId) return false;
    if (order.status !== 0) return false;
    await this.prisma.$transaction(async (tx) => {
      if (order.balanceAmount) {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: order.balanceAmount } }
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { status: 2, updatedAt: unixNow() }
      });
    });
    return true;
  }

  /**
   * Called when a payment webhook confirms an order is paid. Applies the plan
   * to the user, extends/sets expired_at, pays commission to the referrer,
   * and triggers a fresh subscribe by issuing a new token (V2Board does NOT
   * rotate token here — left alone).
   */
  async markPaid(orderId: number, callbackNo: string | null): Promise<boolean> {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order || order.status !== 0) return false;

      const user = await tx.user.findUnique({ where: { id: order.userId } });
      if (!user) return false;
      const plan = await tx.plan.findUnique({ where: { id: order.planId } });
      if (!plan) return false;

      const now = unixNow();
      const data: Record<string, unknown> = { updatedAt: now };
      const period = order.period;
      const isReset = period === "reset_price";
      const isOnetime = period === "onetime_price";

      if (isReset) {
        data.u = BigInt(0);
        data.d = BigInt(0);
      } else if (isOnetime) {
        data.planId = plan.id;
        data.groupId = plan.groupId;
        data.transferEnable = BigInt(Math.round(plan.transferEnable * GIB));
        data.deviceLimit = plan.deviceLimit;
        data.speedLimit = plan.speedLimit;
        data.expiredAt = null;
        data.u = BigInt(0);
        data.d = BigInt(0);
      } else {
        const months = PERIODS[period]?.months ?? 0;
        const base =
          order.type === 1 || user.expiredAt === null || Number(user.expiredAt) < now
            ? now
            : Number(user.expiredAt);
        const expireAt = addMonths(base, months);
        data.planId = plan.id;
        data.groupId = plan.groupId;
        data.transferEnable = BigInt(Math.round(plan.transferEnable * GIB));
        data.deviceLimit = plan.deviceLimit;
        data.speedLimit = plan.speedLimit;
        data.expiredAt = BigInt(expireAt);
        if (order.type === 1 || order.type === 3) {
          data.u = BigInt(0);
          data.d = BigInt(0);
        }
      }

      await tx.user.update({ where: { id: user.id }, data });
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 3,
          paidAt: now,
          callbackNo: callbackNo,
          updatedAt: now
        }
      });

      // Commission to inviter (mirrors V2Board commission rules — simplified).
      if (
        order.inviteUserId &&
        order.totalAmount > 0 &&
        this.settings.getBool("commission_auto_check_enable", true)
      ) {
        const rate = this.settings.getInt("invite_commission", 10);
        const commission = Math.floor((order.totalAmount * rate) / 100);
        if (commission > 0) {
          await tx.commissionLog.create({
            data: {
              userId: order.userId,
              inviteUserId: order.inviteUserId,
              tradeNo: order.tradeNo,
              orderAmount: order.totalAmount,
              getAmount: commission,
              createdAt: now,
              updatedAt: now
            }
          });
          await tx.user.update({
            where: { id: order.inviteUserId },
            data: { commissionBalance: { increment: commission } }
          });
          await tx.order.update({
            where: { id: order.id },
            data: { commissionStatus: 1, commissionBalance: commission }
          });
        }
      }
      return true;
    });
    return result;
  }

  private classifyOrderType(user: User, plan: Plan, period: string): OrderType {
    if (period === "reset_price") return 4;
    if (user.planId === null || (user.expiredAt !== null && Number(user.expiredAt) <= unixNow())) {
      return 1;
    }
    if (user.planId === plan.id) return 2;
    return 3;
  }

  private async calculateSurplusAmount(user: User): Promise<number> {
    if (user.planId === null || user.expiredAt === null) return 0;
    const expiredAt = Number(user.expiredAt);
    if (expiredAt <= unixNow()) return 0;
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        userId: user.id,
        planId: user.planId,
        status: 3,
        period: { in: ["month_price", "quarter_price", "half_year_price", "year_price", "two_year_price", "three_year_price"] }
      },
      orderBy: { paidAt: "desc" }
    });
    if (!lastOrder) return 0;
    const months = PERIODS[lastOrder.period]?.months ?? 0;
    if (months === 0) return 0;
    const totalSeconds = months * 30 * 86400;
    const remaining = expiredAt - unixNow();
    if (remaining <= 0) return 0;
    const ratio = Math.min(1, remaining / totalSeconds);
    return Math.floor(lastOrder.totalAmount * ratio);
  }
}

function addMonths(unix: number, months: number): number {
  if (months === 0) return unix;
  const date = new Date(unix * 1000);
  date.setUTCMonth(date.getUTCMonth() + months);
  return Math.floor(date.getTime() / 1000);
}
