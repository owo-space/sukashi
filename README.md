# 透かし · Sukashi

[![Build and push Docker image](https://github.com/owo-space/sukashi/actions/workflows/docker.yml/badge.svg)](https://github.com/owo-space/sukashi/actions/workflows/docker.yml)
[![Container](https://img.shields.io/badge/ghcr.io-owo--space%2Fsukashi-2496ED?logo=docker&logoColor=white)](https://github.com/owo-space/sukashi/pkgs/container/sukashi)

A modern TypeScript rewrite of the V2Board proxy panel. Sukashi keeps the
familiar admin/user workflow but runs entirely on Node.js (no PHP/Laravel,
no MySQL) with a React frontend.

> 自由への道 — the road to freedom.

## Highlights

- **TypeScript end to end** — NestJS (Fastify) API + React/Vite admin & user panel.
- **PostgreSQL + Prisma** — typed schema, versioned migrations, JSONB-aware.
- **Redis + BullMQ** — background jobs and node-traffic accounting.
- **Multi-client subscriptions** — Clash/Mihomo (YAML), sing-box (JSON),
  Shadowrocket / Quantumult X, Surge, and generic base64 — format auto-detected
  from the client `User-Agent`.
- **Protocols** — Shadowsocks, VLESS, VMess, Trojan, Hysteria2, TUIC, AnyTLS,
  Mieru, and Snell.
- **Built-in i18n** — Simplified Chinese, Traditional Chinese, Japanese, English.

## Architecture

```
sukashi/
├── apps/
│   ├── api/        NestJS + Fastify backend (REST API, subscriptions, jobs)
│   └── web/        React + Vite + Tailwind/shadcn admin & user panel
├── packages/
│   └── shared/     Shared types & protocol definitions
├── prisma/         Prisma schema + migrations (PostgreSQL)
├── Dockerfile      Multi-stage build (pnpm workspace → single runtime image)
└── compose.yaml    app + postgres + redis
```

The container serves the API on port `3000` and ships the prebuilt web panel as
static assets. In production it is fronted by a host reverse proxy (Nginx) for
TLS termination, real-IP, and rate limiting — the app itself binds to loopback.

## Quick start (Docker Compose)

Requires Docker with the Compose plugin.

```bash
git clone https://github.com/owo-space/sukashi.git
cd sukashi
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD, DATABASE_URL, JWT_SECRET (at minimum)

docker compose up -d
```

`compose.yaml` pulls the prebuilt image `ghcr.io/owo-space/sukashi:latest`
(built by CI) with `pull_policy: always`, so every `docker compose up -d`
fetches the newest image — no local build needed. The app entrypoint runs
`prisma migrate deploy` automatically on boot, then starts the API. Visit
`http://127.0.0.1:3000` (or your reverse-proxy host).

### Build the image locally instead

```bash
docker compose -f compose.yaml -f compose.build.yaml up -d --build
```

Tags published to `ghcr.io/owo-space/sukashi`:

| Tag | Meaning |
| --- | --- |
| `latest` | Latest build of the default branch |
| `main` | Default-branch builds |
| `vX.Y.Z`, `vX.Y` | Released versions (from `v*` git tags) |
| `sha-<short>` | Exact commit |

## Configuration

Set via `.env` (Compose) or container environment variables.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Secret for signing session/JWT tokens |
| `REDIS_URL` | | `redis://redis:6379/0` | Redis connection for BullMQ |
| `PORT` | | `3000` | API listen port |
| `PANEL_TITLE` | | `透かし` | Panel name |
| `PANEL_DESCRIPTION` | | `自由への道` | Panel tagline |
| `PANEL_VERSION` | | `1.7.6-sukad.2` | Reported panel version |
| `PANEL_SERVER_TOKEN` | | — | Shared secret for node ↔ panel communication |
| `SKIP_DB_MIGRATE` | | `0` | Set `1` to skip auto-migrate on boot |

For Compose, also set `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
(consumed by the `postgres` service and referenced by `DATABASE_URL`).

## Local development

Requires Node.js ≥ 22 and pnpm (`corepack enable`). A running PostgreSQL and
Redis are needed — the easiest is `docker compose up -d postgres redis`.

```bash
pnpm install
cp .env.example .env          # point DATABASE_URL/REDIS_URL at localhost

pnpm prisma:generate
pnpm --filter @sukashi/api exec prisma migrate deploy

pnpm dev:api                  # API with watch (http://localhost:3000)
pnpm dev:web-source           # Vite dev server for the panel
```

Useful root scripts:

| Command | Purpose |
| --- | --- |
| `pnpm build` | Build shared → api → web |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm test` | Build, then run `node --test tests/*.test.mjs` |

## Deployment notes

- Terminate TLS at a reverse proxy and forward to `127.0.0.1:3000`; pass through
  the real client IP so subscription/User-Agent detection works.
- Persisted state lives in the `postgres_data` and `redis_data` volumes —
  back these up.
- Image upgrades: `docker compose pull && docker compose up -d` (migrations run
  automatically unless `SKIP_DB_MIGRATE=1`).

## License

See [LICENSE](./LICENSE).
