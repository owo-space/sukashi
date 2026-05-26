export const RETAINED_NODE_PROTOCOLS = [
  "anytls",
  "hysteria2",
  "shadowsocks",
  "snell",
  "trojan",
  "tuic",
  "vless",
  "vmess",
  "mieru"
] as const;

export type RetainedNodeProtocol = (typeof RETAINED_NODE_PROTOCOLS)[number];

export const REMOVED_NODE_PROTOCOLS = [
  "hysteria",
  "hysteria1",
  "v2ray"
] as const;

export type RemovedNodeProtocol = (typeof REMOVED_NODE_PROTOCOLS)[number];

export const RETAINED_SUBSCRIPTION_FORMATS = [
  "sing-box",
  "shadowsocks-sip008",
  "vless-uri"
] as const;

export type RetainedSubscriptionFormat =
  (typeof RETAINED_SUBSCRIPTION_FORMATS)[number];

export function isRetainedNodeProtocol(
  protocol: string
): protocol is RetainedNodeProtocol {
  return RETAINED_NODE_PROTOCOLS.includes(protocol as RetainedNodeProtocol);
}

export function isRemovedNodeProtocol(
  protocol: string
): protocol is RemovedNodeProtocol {
  return REMOVED_NODE_PROTOCOLS.includes(protocol as RemovedNodeProtocol);
}

export function assertRetainedNodeProtocol(
  protocol: string
): asserts protocol is RetainedNodeProtocol {
  if (!isRetainedNodeProtocol(protocol)) {
    throw new Error(`Unsupported node protocol: ${protocol}`);
  }
}
