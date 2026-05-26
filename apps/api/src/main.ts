import "reflect-metadata";
import fastifyStatic from "@fastify/static";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication
} from "@nestjs/platform-fastify";
import type { IncomingMessage } from "node:http";
import { AppModule } from "./modules/app.module.js";
import { HttpOkInterceptor } from "./modules/common/http-ok.interceptor.js";

const LEGACY_API_V1_PREFIX = "/api/v1";

function rewriteLegacyApiV1Url(request: IncomingMessage): string {
  const url = request.url ?? "/";
  if (url === LEGACY_API_V1_PREFIX) return "/";
  if (!url.startsWith(`${LEGACY_API_V1_PREFIX}/`)) return url;

  if (url.startsWith(`${LEGACY_API_V1_PREFIX}/protocols/`)) {
    return url;
  }
  if (url === `${LEGACY_API_V1_PREFIX}/health`) {
    return "/api/health";
  }
  if (url.startsWith(`${LEGACY_API_V1_PREFIX}/client/subscribe%3F`)) {
    return `/client/subscribe?${url.slice(
      `${LEGACY_API_V1_PREFIX}/client/subscribe%3F`.length
    )}`;
  }

  return url.slice(LEGACY_API_V1_PREFIX.length);
}

async function bootstrap() {
  const adapter = new FastifyAdapter({
    trustProxy: true,
    rewriteUrl: rewriteLegacyApiV1Url
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    rawBody: true
  });

  const publicDir = fileURLToPath(new URL("../../../public", import.meta.url));
  const webDist = fileURLToPath(new URL("../../web/dist", import.meta.url));

  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/"
  });

  // Serve the Vite build's hashed assets and fonts at the same paths the
  // index.html references (/assets/* and /favicon.svg etc.).
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: "/",
      decorateReply: false
    });
  }

  // SPA fallback: any GET that didn't match a controller or static asset and
  // wants HTML returns index.html so React Router can take over.
  const fastify = app.getHttpAdapter().getInstance();
  const indexHtmlPath = `${webDist}/index.html`;
  fastify.setNotFoundHandler((request, reply) => {
    const accept = String(request.headers.accept ?? "");
    if (
      request.method === "GET" &&
      accept.includes("text/html") &&
      !request.url.startsWith("/api/") &&
      !request.url.startsWith("/assets/") &&
      existsSync(indexHtmlPath)
    ) {
      reply.type("text/html; charset=utf-8");
      return reply.send(readFileSync(indexHtmlPath, "utf-8"));
    }
    return reply.code(404).send({ message: "Not Found" });
  });

  app.enableCors({
    origin: true,
    credentials: true
  });
  app.useGlobalInterceptors(new HttpOkInterceptor());
  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onSend", (_request, reply, payload, done) => {
      const contentType = reply.getHeader("content-type");
      if (typeof contentType === "string" && contentType.startsWith("application/json")) {
        reply.removeHeader("content-type");
        reply.raw.setHeader("content-type", "application/json");
      }
      done(null, payload);
    });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
