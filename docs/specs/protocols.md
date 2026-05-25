# Sukashi Protocol Spec

## Retained Protocol Model

The TypeScript implementation uses an explicit whitelist:

| Protocol | Category | Notes |
| --- | --- | --- |
| `shadowsocks` | First-class | Keep standard AEAD and 2022 Blake3 ciphers. |
| `vless` | First-class | Keep TLS, Reality, flow, uTLS fingerprint, ECH, network settings, and ML-KEM encryption settings. |
| `hysteria2` | sing-box-native | Keep Hysteria v2 only. |
| `tuic` | sing-box-native | Keep congestion control and zero-RTT fields. |
| `anytls` | sing-box-native | Keep padding scheme and TLS settings. |

## Removed Protocol Model

| Removed | Replacement |
| --- | --- |
| `vmess` | Do not migrate. Admin validation rejects it. |
| `trojan` | Do not migrate unless ADR-0002 is changed. |
| `hysteria` v1 | Use `hysteria2`. |
| `v2ray` alias | Use `vless` or a retained sing-box-native type. |

## Subscription Outputs

| Output | Status |
| --- | --- |
| sing-box JSON | Primary output. |
| Shadowsocks SIP008 | Compatibility output for Shadowsocks-only clients. |
| VLESS URI | Compatibility output for VLESS-only imports. |
| Clash/Surge/etc. | Removed. |

## API Behavior

| Case | Behavior |
| --- | --- |
| Creating retained protocol | Accept and persist as typed node config. |
| Creating removed protocol | Return validation error. |
| Loading legacy DB row with removed protocol | Data migration skips by default and reports count. |
| Subscription includes mixed retained/removed nodes | Only retained nodes are emitted; migration reports excluded nodes. |
| Unknown protocol | Hard error. |

## Test Matrix

| Area | Required Tests |
| --- | --- |
| Shadowsocks | AEAD ciphers, 2022 ciphers, server/user key derivation, SIP008 output. |
| VLESS | TCP, WebSocket, gRPC, HTTPUpgrade, xHTTP, TLS, Reality, ECH, ML-KEM. |
| Hysteria2 | Bandwidth fields, obfs settings, TLS/SNI handling. |
| TUIC | Congestion control, UDP relay mode, zero-RTT, TLS settings. |
| AnyTLS | TLS settings and padding scheme. |
| Pruning | Removed protocols are rejected at API and absent from subscription output. |
