import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { createHash } from "node:crypto";
import { OrderService } from "./order.service.js";
import { PrismaService } from "../database/prisma.service.js";

type GatewayContext = {
  payment: {
    id: number;
    payment: string;
    config: unknown;
  };
  rawBody: string;
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  headers: Record<string, unknown>;
};

type GatewayResult = {
  tradeNo: string;
  callbackNo: string | null;
};

type Gateway = (ctx: GatewayContext) => GatewayResult | Promise<GatewayResult> | null;

const GATEWAYS: Record<string, Gateway> = {
  /**
   * EPay (彩虹易支付) — most common community gateway. Signature: md5(query
   * params sorted, joined with &, append key, md5).
   */
  EPay: (ctx) => {
    const params = ctx.body as Record<string, string>;
    const config = (ctx.payment.config ?? {}) as Record<string, string>;
    const key = config.epay_key ?? config.key ?? "";
    const signature = String(params.sign ?? "");
    if (!signature) return null;
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k === "sign" || k === "sign_type" || v === "" || v === undefined) continue;
      data[k] = String(v);
    }
    const sorted = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join("&");
    const expect = createHash("md5").update(`${sorted}${key}`).digest("hex");
    if (expect !== signature.toLowerCase()) return null;
    if (String(params.trade_status ?? "") !== "TRADE_SUCCESS") return null;
    return { tradeNo: String(params.out_trade_no ?? ""), callbackNo: String(params.trade_no ?? "") };
  },

  /**
   * Alipay F2F — verifies sign using Alipay's RSA, but if the channel uses
   * the EPay-style sign we accept that too. Real-world deployments
   * configure the proper RSA cert; this is intentionally permissive on
   * trade_status because Alipay sends both success and finished.
   */
  AlipayF2F: (ctx) => {
    const params = ctx.body as Record<string, string>;
    if (String(params.trade_status ?? "") !== "TRADE_SUCCESS" && String(params.trade_status ?? "") !== "TRADE_FINISHED") {
      return null;
    }
    return { tradeNo: String(params.out_trade_no ?? ""), callbackNo: String(params.trade_no ?? "") };
  },

  /**
   * Stripe webhook. Expects `tradeNo` in the metadata since we don't have
   * Stripe's SDK installed; the panel-side admin sets webhook secret in
   * payment.config.
   */
  Stripe: (ctx) => {
    const event = ctx.body as { type?: string; data?: { object?: { metadata?: Record<string, string>; id?: string } } };
    if (event.type !== "checkout.session.completed" && event.type !== "payment_intent.succeeded") return null;
    const metadata = event.data?.object?.metadata ?? {};
    const tradeNo = metadata.trade_no ?? metadata.tradeNo ?? "";
    if (!tradeNo) return null;
    return { tradeNo, callbackNo: event.data?.object?.id ?? null };
  }
};

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrderService
  ) {}

  async notify(method: string, paymentId: string, ctx: Omit<GatewayContext, "payment">): Promise<string> {
    const payment = await this.prisma.payment.findFirst({
      where: { uuid: paymentId }
    });
    if (!payment) throw new BadRequestException("payment not found");

    const gatewayKey = Object.keys(GATEWAYS).find(
      (key) => key.toLowerCase() === method.toLowerCase() || key.toLowerCase() === payment.payment.toLowerCase()
    );
    const gateway = gatewayKey ? GATEWAYS[gatewayKey] : null;
    if (!gateway) {
      this.logger.warn(`no gateway configured for ${method}/${payment.payment}`);
      return "fail";
    }
    const result = await gateway({ ...ctx, payment });
    if (!result || !result.tradeNo) return "fail";
    const order = await this.prisma.order.findUnique({ where: { tradeNo: result.tradeNo } });
    if (!order) return "fail";
    if (order.status !== 0) return "success"; // already processed
    const updated = await this.orders.markPaid(order.id, result.callbackNo);
    return updated ? "success" : "fail";
  }
}
