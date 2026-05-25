import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { AuthService } from "./auth/auth.service.js";
import {
  AdminGuard,
  AuthenticatedGuard,
  StaffGuard
} from "./auth/auth.guard.js";
import { EmailOtpService } from "./auth/email-otp.js";
import { QuickLoginService } from "./auth/quick-login.js";
import { RateLimitService } from "./auth/rate-limit.js";
import {
  AdminCouponController,
  AdminGiftcardController,
  AdminOrderController,
  AdminPaymentController,
  GuestPaymentController,
  UserCouponController,
  UserGiftcardController,
  UserInviteController,
  UserOrderController
} from "./billing/billing.controllers.js";
import { CouponService } from "./billing/coupon.service.js";
import { OrderService } from "./billing/order.service.js";
import { PaymentService } from "./billing/payment.service.js";
import { ClientController } from "./client/client.controller.js";
import { LegacyApiCompatController } from "./compat/legacy-api.controller.js";
import { ContentController } from "./content/content.controller.js";
import { PrismaService } from "./database/prisma.service.js";
import { RedisService } from "./database/redis.service.js";
import {
  AdminSystemController,
  AdminThemeController,
  GuestCommController,
  TelegramWebhookController,
  UserCommController,
  UserTelegramController
} from "./guest/guest.controller.js";
import { HealthController } from "./health/health.controller.js";
import { MailService } from "./mail/mail.service.js";
import { PanelShellController } from "./panel/panel-shell.controller.js";
import { PanelShellService } from "./panel/panel-shell.service.js";
import {
  PassportCommController,
  PassportController
} from "./passport/passport.controller.js";
import { PassportService } from "./passport/passport.service.js";
import { PlanController } from "./plan/plan.controller.js";
import { ProtocolPolicyController } from "./protocols/protocol-policy.controller.js";
import { ServerController } from "./server/server.controller.js";
import { NodeStatusService } from "./server/node-status.service.js";
import { ConfigController } from "./settings/config.controller.js";
import { SettingsService } from "./settings/settings.service.js";
import {
  AdminStatController,
  StaffTicketController,
  UserStatController,
  UserTicketController
} from "./support/ticket.controller.js";
import {
  AdminUserController,
  UserController
} from "./user/user.controller.js";
import { StaffUserController } from "./user/staff.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    JwtModule.register({})
  ],
  controllers: [
    HealthController,
    ProtocolPolicyController,
    PanelShellController,
    PassportController,
    PassportCommController,
    ClientController,
    UserController,
    AdminUserController,
    StaffUserController,
    PlanController,
    ServerController,
    ContentController,
    ConfigController,
    AdminThemeController,
    AdminSystemController,
    GuestCommController,
    UserCommController,
    UserTelegramController,
    TelegramWebhookController,
    UserOrderController,
    AdminOrderController,
    UserCouponController,
    AdminCouponController,
    UserInviteController,
    AdminPaymentController,
    GuestPaymentController,
    UserGiftcardController,
    AdminGiftcardController,
    UserTicketController,
    StaffTicketController,
    AdminStatController,
    UserStatController,
    LegacyApiCompatController
  ],
  providers: [
    PrismaService,
    RedisService,
    SettingsService,
    PanelShellService,
    MailService,
    EmailOtpService,
    QuickLoginService,
    RateLimitService,
    NodeStatusService,
    AuthService,
    PassportService,
    CouponService,
    OrderService,
    PaymentService,
    AuthenticatedGuard,
    AdminGuard,
    StaffGuard
  ]
})
export class AppModule {}
