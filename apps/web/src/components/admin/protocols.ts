// Per-protocol color (taken from the legacy panel's protocol-picker chips).
//
//   AnyTLS       — orange
//   Hysteria2    — black / slate
//   Shadowsocks  — emerald
//   Trojan       — peach (lighter orange)
//   Tuic         — violet
//   VLess        — sky blue
//   VMess        — pink / magenta
//   Mieru        — teal / cyan
//   Snell        — indigo / purple
//
// `bg` is the chip background. `text` is the chip text (always white-ish on
// the colored chip, except hysteria2 black where it's actually white).

export type Protocol =
  | "anytls"
  | "hysteria2"
  | "shadowsocks"
  | "trojan"
  | "tuic"
  | "vless"
  | "vmess"
  | "mieru"
  | "snell";

interface Spec {
  label: string;
  bg: string;
}

export const PROTOCOLS: Record<Protocol, Spec> = {
  anytls: { label: "AnyTLS", bg: "bg-orange-500" },
  hysteria2: { label: "Hysteria2", bg: "bg-slate-800" },
  shadowsocks: { label: "Shadowsocks", bg: "bg-emerald-500" },
  trojan: { label: "Trojan", bg: "bg-amber-500" },
  tuic: { label: "Tuic", bg: "bg-violet-500" },
  vless: { label: "VLess", bg: "bg-sky-500" },
  vmess: { label: "VMess", bg: "bg-pink-500" },
  mieru: { label: "Mieru", bg: "bg-teal-500" },
  snell: { label: "Snell", bg: "bg-indigo-500" }
};

export const PROTOCOL_ORDER: Protocol[] = [
  "anytls",
  "hysteria2",
  "shadowsocks",
  "trojan",
  "tuic",
  "vless",
  "vmess",
  "mieru",
  "snell"
];
