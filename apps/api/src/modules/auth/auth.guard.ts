import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { AuthService, type AuthenticatedUser } from "./auth.service.js";
import { extractAuthorization } from "./auth-request.js";
import { SettingsService } from "../settings/settings.service.js";

type AuthedFastifyRequest = FastifyRequest & {
  user?: AuthenticatedUser;
};

async function attachUser(
  request: AuthedFastifyRequest,
  authService: AuthService
): Promise<AuthenticatedUser> {
  if (request.user) return request.user;
  const authorization = extractAuthorization(request);
  const user = await authService.requireUser(authorization);
  request.user = user;
  return user;
}

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedFastifyRequest>();
    await attachUser(request, this.authService);
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly settings: SettingsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedFastifyRequest>();
    this.assertAdminPath(request);
    const user = await attachUser(request, this.authService);
    if (!user.isAdmin) throw new ForbiddenException("无管理员权限");
    return true;
  }

  private assertAdminPath(request: AuthedFastifyRequest): void {
    const params = (request.params ?? {}) as Record<string, unknown>;
    const provided = String(params.adminPath ?? "");
    const expected = this.settings.getAdminPath();
    if (!expected || provided !== expected) {
      // 404 (not 403) to avoid revealing whether the admin path exists.
      throw new NotFoundException();
    }
  }
}

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedFastifyRequest>();
    const user = await attachUser(request, this.authService);
    if (!user.isAdmin && !user.isStaff) {
      throw new UnauthorizedException("无员工权限");
    }
    return true;
  }
}
