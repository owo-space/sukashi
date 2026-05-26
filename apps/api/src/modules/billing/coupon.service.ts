import { BadRequestException, Injectable } from "@nestjs/common";
import type { Coupon, Plan, User } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { unixNow } from "../common/unix.js";

export type CouponEvaluation = {
  coupon: Coupon;
  discountAmount: number;
};

@Injectable()
export class CouponService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * V2Board's coupon rules: code+status+date window, optional plan whitelist,
   * optional period whitelist, optional usage caps (global and per user).
   */
  async evaluate(
    code: string,
    plan: Plan,
    period: string,
    totalAmount: number,
    user: Pick<User, "id">
  ): Promise<CouponEvaluation> {
    if (!code) throw new BadRequestException("优惠券码不能为空");
    const coupon = await this.prisma.coupon.findFirst({
      where: { code }
    });
    if (!coupon) throw new BadRequestException("优惠券不存在");
    const now = unixNow();
    if (coupon.startedAt > now) throw new BadRequestException("优惠券尚未生效");
    if (coupon.endedAt && coupon.endedAt < now) throw new BadRequestException("优惠券已过期");

    const planIds = parseIdList(coupon.limitPlanIds);
    if (planIds.length > 0 && !planIds.includes(plan.id)) {
      throw new BadRequestException("此订阅计划不可使用该优惠券");
    }
    const periods = parseStringList(coupon.limitPeriod);
    if (periods.length > 0 && !periods.includes(period)) {
      throw new BadRequestException("当前周期不支持该优惠券");
    }

    if (coupon.limitUse !== null) {
      const used = await this.prisma.order.count({ where: { couponId: coupon.id, status: { in: [0, 1, 3] } } });
      if (used >= coupon.limitUse) {
        throw new BadRequestException("优惠券已抢光");
      }
    }
    if (coupon.limitUseWithUser !== null) {
      const usedByUser = await this.prisma.order.count({
        where: { couponId: coupon.id, userId: user.id, status: { in: [0, 1, 3] } }
      });
      if (usedByUser >= coupon.limitUseWithUser) {
        throw new BadRequestException("您已使用过该优惠券");
      }
    }

    // V2Board convention:
    //   type 1 = percentage discount (value is %, 0-100)
    //   type 2 = fixed-amount discount (value in 分)
    let discount = 0;
    if (coupon.type === 1) discount = Math.floor(totalAmount * (coupon.value / 100));
    if (coupon.type === 2) discount = Math.min(coupon.value, totalAmount);
    if (discount < 0) discount = 0;
    if (discount > totalAmount) discount = totalAmount;

    return { coupon, discountAmount: discount };
  }
}

function parseIdList(value: string | null): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(Number).filter((id) => Number.isInteger(id));
  } catch {
    return value
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((id) => Number.isInteger(id));
  }
  return [];
}

function parseStringList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return value.split(",").map((part) => part.trim()).filter(Boolean);
  }
  return [];
}
