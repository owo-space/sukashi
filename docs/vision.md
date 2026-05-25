# Sukashi TypeScript Rewrite Vision

## Goal

Rewrite the legacy V2Board panel into Sukashi, a TypeScript codebase that preserves the existing product behavior that should remain, especially the current Ant Design Pro visual style.

## Hard Requirements

| Area | Requirement |
| --- | --- |
| UI | No visual redesign. The new frontend must keep the current Ant Design Pro style, layout density, theme colors, and admin/user panel feel. |
| Protocols | Remove legacy protocol surfaces and keep only Shadowsocks, VLESS, and the sing-box-native node set defined in ADR-0002. |
| Database | PostgreSQL is the target database. MySQL-specific SQL and query patterns must not be carried into the TypeScript implementation. |
| Runtime | The target runtime must not depend on PHP or Laravel. |
| Language | New maintainable source code must be TypeScript. Existing compiled frontend bundles are transitional UI parity assets only. |

## Non-Goals

| Non-goal | Reason |
| --- | --- |
| Redesigning the panel UI | The current UI is explicitly preferred. |
| Treating minified frontend bundles as maintainable source | The repository only contains built Umi assets, so they can be served for exact UI parity but not edited as the final source. |
| Preserving Clash/Surge/QuantumultX/Loon/etc. subscriptions | The requested protocol scope is narrower and sing-box-centered. |
| Keeping MySQL install/update SQL as the new schema source | PostgreSQL needs explicit JSONB, enum, index, and migration decisions. |
| Keeping Laravel as the final backend | PHP code is reference material only; the finished panel runs on TypeScript/Node. |

## Current Source of Truth

| Surface | Current implementation |
| --- | --- |
| User frontend reference | `public/theme/default/dashboard.blade.php` loads built Umi/React assets into `#root`. |
| Admin frontend reference | `resources/views/admin.blade.php` loads built Umi/React assets into `#root`. |
| Backend behavior reference | Laravel 8 controllers, services, queue jobs, payments, and routes under `app/`. |
| Protocol builders | PHP classes under `app/Protocols/` plus node APIs under `app/Http/Controllers/V1/Server/` and `V2/Server/`. |
| Database bootstrap | MySQL SQL files under `database/install.sql` and `database/update.sql`. |

## Rewrite Rule

Sukashi replaces the Laravel runtime. Existing Laravel files are kept only as behavior references until each module has TypeScript implementation, tests, and migration coverage.

During the first UI parity phase, the TypeScript API may serve the existing compiled Umi/React bundles directly so the browser renders the real current panel without PHP. Those bundles are a baseline and migration bridge, not the final maintainable frontend source.
