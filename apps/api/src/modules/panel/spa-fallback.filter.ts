import {
  ArgumentsHost,
  Catch,
  HttpException,
  NotFoundException,
  type ExceptionFilter
} from "@nestjs/common";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { FastifyReply, FastifyRequest } from "fastify";

const INDEX_HTML_PATH = fileURLToPath(new URL("../../../../web/dist/index.html", import.meta.url));
let cached: string | null = null;
function indexHtml(): string | null {
  if (cached !== null) return cached;
  if (!existsSync(INDEX_HTML_PATH)) return null;
  cached = readFileSync(INDEX_HTML_PATH, "utf-8");
  return cached;
}

/**
 * Catches 404s coming out of NestJS and serves the SPA shell for any GET
 * that accepts HTML and isn't pointed at /api/*. Everything else still
 * returns a plain JSON 404 so the panel's JSON API stays well-behaved.
 */
@Catch(NotFoundException)
export class SpaFallbackFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<FastifyRequest>();
    const res = http.getResponse<FastifyReply>();
    const accept = String(req.headers.accept ?? "");
    const url = req.url ?? "/";

    if (
      req.method === "GET" &&
      accept.includes("text/html") &&
      !url.startsWith("/api/")
    ) {
      const html = indexHtml();
      if (html) {
        res.type("text/html; charset=utf-8").send(html);
        return;
      }
    }

    const status = exception.getStatus();
    const body = exception.getResponse();
    res.status(status).send(body);
  }
}
