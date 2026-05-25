# ADR-0001: Sukashi TypeScript Monorepo Architecture

## Status

Accepted.

## Context

The current project is a Laravel panel with built frontend bundles. The frontend bundle fingerprints show Umi, React, dva, Ant Design, and Ant Design Pro classes, but the maintainable frontend source is not present. The backend contains API routes, authentication, payments, queue jobs, traffic accounting, subscription generation, and node-agent APIs.

Sukashi needs TypeScript across the panel, PostgreSQL instead of MySQL, visual parity with the existing UI, and no PHP in the target runtime.

## Decision

Use a pnpm TypeScript monorepo:

| Package | Role | Framework |
| --- | --- | --- |
| `apps/api` | Sukashi backend API, node APIs, subscription generation, jobs, and the no-PHP panel shell | NestJS + Fastify |
| `apps/web` | Sukashi maintainable React TypeScript replacement for the current compiled UI | Vite + React + Ant Design + ProLayout |
| `packages/shared` | Shared protocol constants, API enums, typed contracts | TypeScript |
| `prisma` | PostgreSQL schema and migrations | Prisma |

The first no-PHP UI phase serves the existing compiled Umi/React bundles from `apps/api`, using a TypeScript-rendered HTML shell equivalent to the old Blade templates. This proves the panel can render without Laravel before the UI is rebuilt from source.

The maintainable React source in `apps/web` starts with Ant Design 4 and `@ant-design/pro-layout` 6 instead of the newest Ant Design major. This is intentional: the current built assets use older Ant Design / Ant Design Pro visual conventions, so the first source rewrite target should preserve the old look before any later component upgrade is considered.

## Consequences

| Consequence | Impact |
| --- | --- |
| Backend and frontend can migrate independently | Laravel is kept as a reference, not as the target runtime. |
| API compatibility can be tested route by route | Existing clients and node agents can be ported without a big-bang cutover. |
| PostgreSQL schema is explicit | JSON arrays/settings become JSONB instead of MySQL text blobs. |
| UI parity must be tested visually | Rebuilt pages need screenshot checks against the current compiled panel. |

## Rejected Options

| Option | Reason |
| --- | --- |
| Next.js full-stack | Background jobs, node APIs, and subscription endpoints are cleaner in a dedicated API service. |
| Latest Ant Design major immediately | Too much visual drift risk for a no-UI-change migration. |
| Editing minified `umi.js` bundles | Not maintainable and not the final TypeScript source; serving them is allowed only as a no-PHP parity bridge. |
| Continuing Laravel with TypeScript frontend only | Does not satisfy the full TypeScript panel direction. |
