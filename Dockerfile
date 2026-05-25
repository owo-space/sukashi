FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .
RUN find . -name '*.tsbuildinfo' -delete \
  && pnpm --filter @sukashi/shared build \
  && pnpm --filter @sukashi/web build \
  && pnpm --filter @sukashi/api build

FROM base AS runtime

ENV NODE_ENV="production"
ENV PORT="3000"

WORKDIR /app

COPY --from=build /app /app
COPY docker-entrypoint.sh /usr/local/bin/sukashi-entrypoint

RUN chmod +x /usr/local/bin/sukashi-entrypoint

EXPOSE 3000

ENTRYPOINT ["sukashi-entrypoint"]
CMD ["pnpm", "--filter", "@sukashi/api", "start"]
