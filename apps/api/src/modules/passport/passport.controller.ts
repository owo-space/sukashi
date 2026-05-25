import { All, Body, Controller, Get, Headers, Post, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "../auth/auth.service.js";
import { QuickLoginService } from "../auth/quick-login.js";
import { dataResponse } from "../common/json.js";
import { PrismaService } from "../database/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { PassportService } from "./passport.service.js";

function requestMeta(request: FastifyRequest) {
  return {
    ip: request.ip,
    userAgent: request.headers["user-agent"]
  };
}

@Controller("passport/auth")
export class PassportController {
  constructor(
    private readonly authService: AuthService,
    private readonly passportService: PassportService,
    private readonly prisma: PrismaService,
    private readonly quickLogin: QuickLoginService,
    private readonly settings: SettingsService
  ) {}

  @Post("register")
  async register(@Body() body: Record<string, unknown>, @Req() request: FastifyRequest) {
    return dataResponse(await this.passportService.register(body, requestMeta(request)));
  }

  @Get("register")
  async registerFromQuery(
    @Query() query: Record<string, unknown>,
    @Req() request: FastifyRequest
  ) {
    return dataResponse(
      await this.passportService.register(query, requestMeta(request))
    );
  }

  @Post("login")
  async login(@Body() body: Record<string, unknown>, @Req() request: FastifyRequest) {
    return dataResponse(await this.passportService.login(body, requestMeta(request)));
  }

  @Post("forget")
  async forget(@Body() body: Record<string, unknown>, @Req() request: FastifyRequest) {
    return dataResponse(await this.passportService.forget(body, requestMeta(request)));
  }

  @Post("getQuickLoginUrl")
  async getQuickLoginUrl(
    @Body() body: Record<string, unknown>,
    @Headers("authorization") authorization?: string
  ) {
    const user = await this.authService.requireUser(
      String(body.auth_data ?? authorization ?? "")
    );
    return dataResponse(await this.buildQuickLoginUrl(user.id, body.redirect));
  }

  /**
   * Both GET (browser redirect after admin issued quick-login URL) and POST
   * (frontend exchanging verify code for an auth_data session). Mirrors PHP
   * token2Login which serves both flows from one handler.
   */
  @All("token2Login")
  async token2Login(
    @Query() query: Record<string, unknown>,
    @Body() body: Record<string, unknown>,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const token = String(query.token ?? body.token ?? "");
    const verify = String(query.verify ?? body.verify ?? "");

    if (token) {
      // Admin-side flow: redirect into the panel carrying the verify code.
      const userId = await this.quickLogin.consume(token);
      if (!userId) return reply.code(403).send({ message: "token error" });
      const fresh = await this.quickLogin.issue(userId);
      const appUrl = this.settings.getString("app_url");
      const redirect = `/#/login?verify=${encodeURIComponent(fresh)}&redirect=${encodeURIComponent(String(query.redirect ?? body.redirect ?? "dashboard"))}`;
      const location = appUrl ? `${appUrl}${redirect}` : redirect;
      reply.code(302).header("location", location).send();
      return;
    }

    if (verify) {
      const userId = await this.quickLogin.consume(verify);
      if (!userId) return reply.code(500).send({ message: "Token error" });
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.code(500).send({ message: "user not found" });
      return dataResponse(
        await this.authService.issueSession(user, {
          ip: request.ip,
          userAgent: request.headers["user-agent"]
        })
      );
    }

    return reply.code(400).send({ message: "missing token or verify" });
  }

  private async buildQuickLoginUrl(userId: number, redirectInput: unknown): Promise<string> {
    const code = await this.quickLogin.issue(userId);
    const redirect = String(redirectInput ?? "dashboard");
    const appUrl = this.settings.getString("app_url");
    const path = `/#/login?verify=${encodeURIComponent(code)}&redirect=${encodeURIComponent(redirect)}`;
    return appUrl ? `${appUrl}${path}` : path;
  }
}

@Controller("passport/comm")
export class PassportCommController {
  constructor(
    private readonly passportService: PassportService,
    private readonly prisma: PrismaService
  ) {}

  @Post("sendEmailVerify")
  async sendEmailVerify(@Body() body: Record<string, unknown>) {
    await this.passportService.sendEmailVerify(body);
    return dataResponse(true);
  }

  /**
   * Tracks invite-link page views: bumps InviteCode.pv when someone hits the
   * registration page with ?invite_code=...
   */
  @Post("pv")
  async pv(@Body() body: Record<string, unknown>) {
    const code = String(body.invite_code ?? "").trim();
    if (!code) return dataResponse(true);
    await this.prisma.inviteCode.updateMany({
      where: { code },
      data: { pv: { increment: 1 } }
    });
    return dataResponse(true);
  }
}
