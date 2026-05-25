import "reflect-metadata";
import fastifyStatic from "@fastify/static";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication
} from "@nestjs/platform-fastify";
import type { IncomingMessage } from "node:http";
import { fileURLToPath } from "node:url";
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
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: true,
      rewriteUrl: rewriteLegacyApiV1Url
    })
  );

  await app.register(fastifyStatic, {
    root: fileURLToPath(new URL("../../../public", import.meta.url)),
    prefix: "/"
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
