import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { Order, Payment } from "@prisma/client";
import type { FastifyRequest } from "fastify";
import Stripe from "stripe";
import { OrderService } from "./order.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";

type StripeConfig = {
  stripe_secret_key?: string;
  stripe_public_key?: string;
  stripe_webhook_secret?: string;
  currency?: string;
};

export type CheckoutContext = {
  request: FastifyRequest;
};

export type WebhookContext = {
  rawBody: Buffer;
  headers: Record<string, unknown>;
};

const SUCCESS_EVENT_TYPES = new Set([
  "checkout.session.completed",
  "payment_intent.succeeded"
]);

/**
 * Stripe Checkout's minimum charge per currency (in the smallest unit).
 * Anything below this returns "must convert to at least 50 cents". We
 * clamp upward to keep checkout possible even when a generous coupon
 * brings the order below the floor.
 */
const STRIPE_MIN_CHARGE: Record<string, number> = {
  usd: 50,
  cad: 50,
  eur: 50,
  aud: 50,
  nzd: 50,
  sgd: 50,
  hkd: 400,
  gbp: 30,
  jpy: 50,
  cny: 350,
  twd: 1500,
  krw: 600
};

function configOf(payment: Payment): StripeConfig {
  const value = payment.config as unknown;
  if (!value || typeof value !== "object") return {};
  return value as StripeConfig;
}

function firstHeaderValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (value === undefined || value === null) return "";
  return String(value);
}

/**
 * The origin the user's browser was talking to (suka-dev.owo.as vs
 * suka.owo.as) — derived from the forwarded headers Cloudflare/Nginx
 * pass through. Used for Stripe success/cancel redirects so the user
 * lands back on the same site they checked out from.
 */
function requestOrigin(request: FastifyRequest): string {
  const host =
    firstHeaderValue(request.headers["x-forwarded-host"]) ||
    firstHeaderValue(request.headers.host);
  if (!host) return "";
  const proto = firstHeaderValue(request.headers["x-forwarded-proto"]) || "https";
  return `${proto}://${host}`;
}

/**
 * Configured public origin (`app_url` setting). Used by the webhook URL
 * the admin paste-and-fills into Stripe — that one must be stable and
 * point at the production host regardless of who triggers the request.
 */
function publicOrigin(request: FastifyRequest, settings: SettingsService): string {
  const explicit = settings.getString("app_url");
  if (explicit) return explicit.replace(/\/+$/, "");
  const host =
    firstHeaderValue(request.headers["x-forwarded-host"]) ||
    firstHeaderValue(request.headers.host);
  if (!host) return "";
  const proto = firstHeaderValue(request.headers["x-forwarded-proto"]) || "https";
  return `${proto}://${host}`;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrderService,
    private readonly settings: SettingsService
  ) {}

  /**
   * Build a Stripe Checkout Session for the given order and return the
   * hosted-page URL so the user-side checkout page can redirect to it.
   * Throws if the payment row is not Stripe (the panel is Stripe-only).
   */
  async createCheckout(
    payment: Payment,
    order: Order,
    ctx: CheckoutContext
  ): Promise<{ url: string; sessionId: string }> {
    if (payment.payment !== "Stripe") {
      throw new BadRequestException(
        `payment provider "${payment.payment}" is not supported — only Stripe is available`
      );
    }
    const cfg = configOf(payment);
    if (!cfg.stripe_secret_key) {
      throw new BadRequestException("stripe_secret_key is not configured");
    }
    const stripe = new Stripe(cfg.stripe_secret_key);
    const currency = (cfg.currency || "usd").toLowerCase();
    // Use the user's request origin (suka.owo.as vs suka-dev.owo.as) for
    // Stripe's redirect URLs so the user returns to the same site they
    // started checkout from. The configured app_url is still used for the
    // webhook callback path (set in Stripe dashboard, separate config).
    const origin = requestOrigin(ctx.request) || publicOrigin(ctx.request, this.settings);
    const successUrl = `${origin}/#/order/${encodeURIComponent(order.tradeNo)}?paid=1`;
    const cancelUrl = `${origin}/#/order/${encodeURIComponent(order.tradeNo)}?cancel=1`;

    // Stripe Checkout rejects any session whose unit_amount converts to
    // less than ~$0.50 USD. After coupon discounts the order may dip
    // below that floor (e.g. a 90%-off coupon on a ¥30 plan gives a ¥3
    // order). Clamp upward to the per-currency minimum so the user can
    // still pay, instead of erroring out.
    const minAmount = STRIPE_MIN_CHARGE[currency] ?? 50;
    const unitAmount = Math.max(order.totalAmount, minAmount);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            // Stripe's unit_amount is "smallest currency unit". V2Board stores
            // totalAmount in 分 (cents) which lines up directly for USD/EUR;
            // for zero-decimal currencies (JPY etc) the admin must price the
            // plan in whole units of the smallest unit themselves.
            unit_amount: unitAmount,
            product_data: {
              name: `Sukashi Order ${order.tradeNo}`
            }
          }
        }
      ],
      client_reference_id: order.tradeNo,
      metadata: {
        trade_no: order.tradeNo,
        order_id: String(order.id),
        user_id: String(order.userId)
      },
      success_url: successUrl,
      cancel_url: cancelUrl
    });

    return { url: session.url ?? cancelUrl, sessionId: session.id };
  }

  /**
   * Verify and process an incoming Stripe webhook. Returns the literal
   * string "success" or "fail" because that's the response shape Stripe
   * expects (200 + any body counts as success; we just return "success"
   * for readability in nginx access logs).
   */
  async notify(paymentUuid: string, ctx: WebhookContext): Promise<string> {
    const payment = await this.prisma.payment.findFirst({
      where: { uuid: paymentUuid }
    });
    if (!payment) {
      this.logger.warn(`webhook hit for unknown payment uuid=${paymentUuid}`);
      return "fail";
    }
    if (payment.payment !== "Stripe") {
      this.logger.warn(`webhook for non-Stripe payment ${payment.payment} — ignoring`);
      return "fail";
    }
    const cfg = configOf(payment);
    if (!cfg.stripe_secret_key) {
      this.logger.error("Stripe webhook arrived but stripe_secret_key not configured");
      return "fail";
    }
    if (!cfg.stripe_webhook_secret) {
      this.logger.error(
        "Stripe webhook arrived but stripe_webhook_secret not configured — cannot verify signature"
      );
      return "fail";
    }
    const signature = firstHeaderValue(ctx.headers["stripe-signature"]);
    if (!signature) {
      this.logger.warn("Stripe webhook missing stripe-signature header");
      return "fail";
    }
    if (!ctx.rawBody || ctx.rawBody.length === 0) {
      this.logger.error("Stripe webhook arrived without raw body");
      return "fail";
    }

    const stripe = new Stripe(cfg.stripe_secret_key);
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        ctx.rawBody,
        signature,
        cfg.stripe_webhook_secret
      );
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${(err as Error).message}`);
      return "fail";
    }

    if (!SUCCESS_EVENT_TYPES.has(event.type)) {
      // Many Stripe events are informational (refund.created etc) — ignore
      // gracefully so Stripe doesn't keep retrying.
      return "success";
    }

    const obj = event.data.object as
      | (Stripe.Checkout.Session & { client_reference_id?: string | null })
      | (Stripe.PaymentIntent & { metadata?: Record<string, string> });

    const metadata = obj.metadata ?? {};
    const tradeNo =
      metadata.trade_no ||
      (event.type === "checkout.session.completed"
        ? (obj as Stripe.Checkout.Session).client_reference_id ?? ""
        : "");
    if (!tradeNo) {
      this.logger.warn(`Stripe ${event.type} arrived without trade_no metadata`);
      return "fail";
    }

    const order = await this.prisma.order.findUnique({ where: { tradeNo } });
    if (!order) {
      this.logger.warn(`Stripe webhook references unknown order ${tradeNo}`);
      return "fail";
    }
    if (order.status !== 0) return "success"; // already paid / cancelled
    const ok = await this.orders.markPaid(order.id, obj.id ?? null);
    return ok ? "success" : "fail";
  }
}
