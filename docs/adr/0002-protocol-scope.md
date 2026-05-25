# ADR-0002: Protocol Scope

## Status

Accepted with one explicit assumption.

## User Requirement

Remove all other protocols and keep only VLESS, Shadowsocks, and the protocols native to sing-box.

## Assumption

In this rewrite, "sing-box-native" means the modern node protocols this panel already models for sing-box-centered deployments: `hysteria2`, `tuic`, and `anytls`. VLESS and Shadowsocks stay as first-class protocols. Legacy VMess, Trojan, Hysteria v1, and non-sing-box client subscription formats are removed from the new TypeScript surface.

If Trojan should be kept because sing-box can implement it, this ADR is the file to change before porting protocol code.

## Retained Node Protocols

| Protocol | Reason |
| --- | --- |
| `shadowsocks` | Explicitly requested; current panel supports 2022 ciphers and SIP008 output. |
| `vless` | Explicitly requested; current panel supports TLS, Reality, uTLS fingerprint, ECH, xHTTP, and ML-KEM settings. |
| `hysteria2` | Treated as sing-box-native scope. |
| `tuic` | Treated as sing-box-native scope. |
| `anytls` | Treated as sing-box-native scope. |

## Removed From New TypeScript Surface

| Surface | Removed items |
| --- | --- |
| Node protocols | `vmess`, `trojan`, `hysteria` v1, legacy `v2ray` aliases |
| Subscription clients | Clash, Clash Meta, Clash Verge, Clash Nyanpasu, Surge, Surfboard, Stash, Loon, Quantumult X, Shadowrocket, SagerNet, Passwall, SSRPlus, V2rayN, V2rayNG, v2RayTun |
| Legacy node APIs | Deepbwork VMess, Tidalab Trojan, Tidalab Shadowsocks after compatible sing-box/v2node APIs exist |

## Required Compatibility

| Area | Rule |
| --- | --- |
| Subscriptions | `sing-box` JSON remains the primary generated subscription format. Shadowsocks SIP008 and VLESS URI can be provided as narrow compatibility outputs. |
| Node API | Keep a TypeScript equivalent of the current unified node API for retained protocols. |
| Database | Do not create tables for removed protocols. Store retained node types in one typed PostgreSQL-backed node model. |
| UI | Protocol selectors must not show removed protocols. Old protocol labels must not remain as dead options. |

## Default for Unspecified Protocols

Any protocol not listed in "Retained Node Protocols" is rejected at validation time with a clear error. It should not be silently downgraded or hidden after save.
