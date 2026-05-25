# Sukashi Rewrite Roadmap

## Milestone Status

| Milestone | Status | Exit Criteria |
| --- | --- | --- |
| M0: Harness and architecture | In progress | ADRs, specs, TS workspace, protocol whitelist, PostgreSQL schema draft, and no-PHP panel shell committed. |
| M1: Backend core | Pending | Auth, users, plans, orders, payments, tickets, config, and settings APIs ported with tests. |
| M2: Protocol core | Pending | Retained protocols generate sing-box config and node-agent config; removed protocols fail validation. |
| M3: UI parity | Pending | Admin/user routes rebuilt in React TS with screenshot parity against current panel. |
| M4: Data migration | Pending | MySQL-to-PostgreSQL import path validated on representative data. |
| M5: Cutover | Pending | Sukashi API + web app replace Laravel runtime behind the same public routes; PHP is no longer required. |

## M0 Tasks

| ID | Task | Status |
| --- | --- | --- |
| M0-1 | Inventory current UI, routes, protocol code, and MySQL schema | Completed |
| M0-2 | Choose TypeScript architecture | Completed |
| M0-3 | Define retained/removed protocol scope | Completed |
| M0-4 | Draft PostgreSQL schema strategy | Completed |
| M0-5 | Add initial TypeScript workspace skeleton | Completed |
| M0-6 | Serve the existing panel UI bundles from Node without PHP | Completed |

## Migration Order

1. Serve the existing compiled panel bundles from the Sukashi API so UI parity starts from the real current UI without PHP.
2. Build typed contracts and PostgreSQL schema first.
3. Port backend APIs behind the same route shapes.
4. Port protocol generation and node-agent endpoints.
5. Rebuild frontend route by route as maintainable React TypeScript source with visual diff checks against the served legacy bundle.
6. Run database migration into PostgreSQL.
7. Remove Laravel/PHP from the runtime path.

## Verification Gates

| Gate | Required Checks |
| --- | --- |
| API parity | Route-level tests compare TypeScript responses against Laravel fixtures. |
| Protocol parity | Snapshot tests for sing-box JSON, VLESS URI, and Shadowsocks SIP008. |
| Protocol pruning | Tests assert removed protocols are rejected by API validation and absent from UI options. |
| UI parity | Desktop/mobile screenshots for admin and user pages before replacing old views. |
| DB migration | PostgreSQL migration imports users, plans, orders, settings, retained nodes, and traffic stats without lossy type conversion. |
