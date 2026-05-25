# Sukashi PostgreSQL Schema Spec

## Decision

Use PostgreSQL through Prisma. New TypeScript code should use typed tables and JSONB instead of MySQL text fields for arrays and nested settings.

## Schema Rules

| Rule | Requirement |
| --- | --- |
| JSON settings | Store as PostgreSQL `jsonb` via Prisma `Json`. |
| Protocols | Use a PostgreSQL enum generated from the retained whitelist. |
| Timestamps | Store as `timestamptz`; serialize to Unix seconds only at API boundaries when compatibility requires it. |
| Money | Continue storing integer minor units unless a payment provider requires decimal metadata. |
| Traffic | Store upload/download as `bigint`. |
| MySQL-specific queries | Replace `FIELD(...)`, backtick identifiers, `tinyint(1)` booleans, and stringified arrays. |

## Core Model Shape

| Model | Purpose |
| --- | --- |
| `User` | Account, traffic, balance, admin/staff flags, subscription token. |
| `Plan` | Product plan and traffic limits. |
| `ServerGroup` | Permission group for node access. |
| `ServerRoute` | Route rules used by node-agent config. |
| `ServerNode` | Unified retained protocol node table. |
| `Order` | Purchases, renewals, upgrades, payment lifecycle. |
| `PaymentMethod` | Payment provider config. |
| `Ticket` / `TicketMessage` | Support tickets. |
| `TrafficStatUser` / `TrafficStatServer` | Usage aggregation. |
| `AuditLog` | Request/system logs. |

## Migration Rules

| Source | Target |
| --- | --- |
| `v2_server_shadowsocks` | `server_nodes` with `protocol = SHADOWSOCKS`. |
| `v2_server_vless` | `server_nodes` with `protocol = VLESS`. |
| `v2_server_v2node` retained rows | `server_nodes` when protocol is in the retained whitelist. |
| `v2_server_vmess`, `v2_server_trojan`, `v2_server_hysteria` v1 | Excluded unless ADR-0002 changes. |
| `group_id`, `route_id`, `tags`, settings text | Parsed into JSONB. Invalid JSON is reported and not silently coerced. |

## Validation Gate

The migration must print counts for imported rows, skipped removed-protocol rows, and invalid JSON/settings rows. A migration with unreported skipped data is considered failed.
