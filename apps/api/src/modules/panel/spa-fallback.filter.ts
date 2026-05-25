import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  NotFoundException
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PanelShellService } from "./panel-shell.service.js";

@Catch(NotFoundException)
export class SpaFallbackFilter implements ExceptionFilter {
  constructor(private readonly shell: PanelShellService) {}

  async catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();
    const url = request.url ?? "/";

    if (url.startsWith("/api/") || url.startsWith("/client/")) {
      reply
        .code(404)
        .header("content-type", "application/json")
        .send({ code: 404, message: exception.message ?? "Not Found" });
      return;
    }

    const html = await this.shell.render();
    reply
      .code(200)
      .header("content-type", "text/html; charset=utf-8")
      .send(html);
  }
}
