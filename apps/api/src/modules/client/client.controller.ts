import { Controller, Get, Headers, Query, Res } from "@nestjs/common";
import type { ServerNode, User } from "@prisma/client";
import type { FastifyReply } from "fastify";
import { PrismaService } from "../database/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";

type QueryValue = string | string[] | undefined;

type MieruPortBinding = {
  port?: number;
  port_range?: string;
  portRange?: string;
  protocol?: string;
};

type SingBoxOutbound = Record<string, unknown> & {
  tag: string;
};

const DEFAULT_APP_NAME = "透かし";

function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

function firstQueryValue(value: QueryValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function asJson(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value === undefined || value === null || value === "") return [];
  if (typeof value === "number") return [String(value)];
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function asIdArray(value: unknown): number[] {
  return asStringArray(value)
    .map(Number)
    .filter((item) => Number.isInteger(item) && item > 0);
}

function includesGroup(groupId: unknown, target?: number | null): boolean {
  if (!target) return false;
  return asIdArray(groupId).includes(target);
}

function isUserAvailable(user: User): boolean {
  const expiredAt = user.expiredAt === null ? null : Number(user.expiredAt);
  if (user.banned) return false;
  if (expiredAt !== null && expiredAt > 0 && expiredAt < unixNow()) return false;
  if (user.transferEnable <= user.u + user.d) return false;
  return true;
}

function protocolOf(server: ServerNode): string {
  return String(server.protocol).toLowerCase();
}

function clientPort(server: ServerNode): number {
  const parsed = Number(server.port || server.serverPort);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : server.serverPort;
}

function formatHost(host: string): string {
  return host.includes(":") && !host.startsWith("[") ? `[${host}]` : host;
}

function base64(input: string): string {
  return Buffer.from(input).toString("base64");
}

function base64Url(input: string): string {
  return base64(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function yamlString(value: unknown): string {
  return JSON.stringify(String(value ?? ""));
}

function tlsSettingsOf(server: ServerNode): Record<string, unknown> {
  const parsed = asJson(server.tlsSettings);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return {};
}

function serverNameOf(server: ServerNode): string {
  const tls = tlsSettingsOf(server);
  return (
    (tls.server_name as string | undefined) ??
    (tls.serverName as string | undefined) ??
    server.host
  );
}

/**
 * V2Board only sets Content-Disposition for protocols that explicitly want
 * the file downloaded (v2RayTun etc); the default subscription response is
 * served inline so a browser visit displays the raw text instead of
 * triggering a download. The headers below are the ones every subscription
 * client (Clash / Shadowrocket / SingBox / Quantumult) actually reads.
 */
function buildSubscriptionHeaders(reply: FastifyReply, user: User, appName: string) {
  reply.header(
    "Subscription-Userinfo",
    `upload=${user.u}; download=${user.d}; total=${user.transferEnable}; expire=${user.expiredAt ?? 0}`
  );
  reply.header("Profile-Update-Interval", "24");
  reply.header("Profile-Title", `base64:${base64(appName)}`);
}

function buildShadowsocksUri(uuid: string, server: ServerNode): string | null {
  if (!server.cipher) return null;
  const auth = base64Url(`${server.cipher}:${uuid}`);
  return `ss://${auth}@${formatHost(server.host)}:${clientPort(server)}#${encodeURIComponent(
    server.name
  )}`;
}

function buildVlessUri(uuid: string, server: ServerNode): string {
  const params = new URLSearchParams();
  params.set("type", String(server.network || "tcp").toLowerCase());
  params.set("encryption", server.encryption || "none");
  params.set("security", server.tls ? (server.tls === 2 ? "reality" : "tls") : "none");
  if (server.flow) params.set("flow", server.flow);
  const tls = tlsSettingsOf(server);
  if (tls.server_name) params.set("sni", String(tls.server_name));
  if (tls.serverName) params.set("sni", String(tls.serverName));
  return `vless://${uuid}@${formatHost(server.host)}:${clientPort(server)}?${params.toString()}#${encodeURIComponent(
    server.name
  )}`;
}

function buildVmessUri(uuid: string, server: ServerNode): string {
  const tls = tlsSettingsOf(server);
  const networkSettings = (asJson(server.networkSettings) ?? {}) as Record<string, unknown>;
  const payload: Record<string, unknown> = {
    v: "2",
    ps: server.name,
    add: server.host,
    port: clientPort(server),
    id: uuid,
    aid: 0,
    scy: "auto",
    net: String(server.network || "tcp").toLowerCase(),
    type: "none",
    host: tls.server_name ?? networkSettings.host ?? "",
    path: networkSettings.path ?? "/",
    tls: server.tls ? "tls" : "",
    sni: tls.server_name ?? ""
  };
  return `vmess://${base64(JSON.stringify(payload))}`;
}

function buildTrojanUri(uuid: string, server: ServerNode): string {
  const params = new URLSearchParams();
  const sni = serverNameOf(server);
  if (sni) params.set("sni", sni);
  if (server.network) params.set("type", String(server.network).toLowerCase());
  return `trojan://${encodeURIComponent(uuid)}@${formatHost(server.host)}:${clientPort(server)}?${params.toString()}#${encodeURIComponent(
    server.name
  )}`;
}

function buildHysteria2Uri(uuid: string, server: ServerNode): string {
  const params = new URLSearchParams();
  const sni = serverNameOf(server);
  if (sni) params.set("sni", sni);
  if (server.insecure ?? false) params.set("insecure", "1");
  if (server.obfs) {
    params.set("obfs", server.obfs);
    if (server.obfsPassword) params.set("obfs-password", server.obfsPassword);
  }
  return `hysteria2://${encodeURIComponent(uuid)}@${formatHost(server.host)}:${clientPort(server)}/?${params.toString()}#${encodeURIComponent(
    server.name
  )}`;
}

function buildTuicUri(uuid: string, server: ServerNode): string {
  const params = new URLSearchParams();
  params.set("congestion_control", server.congestionControl ?? "bbr");
  params.set("udp_relay_mode", server.udpRelayMode ?? "native");
  if (server.disableSni) params.set("disable_sni", "1");
  const sni = serverNameOf(server);
  if (sni) params.set("sni", sni);
  return `tuic://${encodeURIComponent(uuid)}:${encodeURIComponent(uuid)}@${formatHost(server.host)}:${clientPort(server)}?${params.toString()}#${encodeURIComponent(
    server.name
  )}`;
}

function buildAnytlsUri(uuid: string, server: ServerNode): string {
  const params = new URLSearchParams();
  const sni = serverNameOf(server);
  if (sni) params.set("sni", sni);
  return `anytls://${encodeURIComponent(uuid)}@${formatHost(server.host)}:${clientPort(server)}?${params.toString()}#${encodeURIComponent(
    server.name
  )}`;
}

function mieruBindings(server: ServerNode): MieruPortBinding[] {
  const settings = asJson(server.mieruSettings) as Record<string, unknown> | null;
  const bindings = settings?.port_bindings;
  if (Array.isArray(bindings) && bindings.length > 0) {
    return bindings as MieruPortBinding[];
  }
  return [
    {
      port: server.serverPort,
      protocol: String(server.network || "TCP").toUpperCase()
    }
  ];
}

const MIERU_MULTIPLEXING_LEVELS = new Set([
  "MULTIPLEXING_OFF",
  "MULTIPLEXING_LOW",
  "MULTIPLEXING_MIDDLE",
  "MULTIPLEXING_HIGH"
]);

const MIERU_HANDSHAKE_MODES = new Set(["HANDSHAKE_STANDARD", "HANDSHAKE_NO_WAIT"]);

function mieruMultiplexing(
  settings: Record<string, unknown> | null,
  bindingCount: number
): string {
  // mieru's "multiplexing" controls how aggressively the client REUSES
  // existing TCP sessions instead of opening new ones (LOW factor=1,
  // MIDDLE=2, HIGH=3, OFF=0 = always-new). The official docs use HIGH only
  // because their example binds 4 ports across TCP+UDP — multiple underlay
  // sessions exist to spread across. With a SINGLE TCP port (our default)
  // HIGH funnels 16 parallel speed-test streams onto one TCP connection,
  // crushing throughput via head-of-line blocking + BDP cap.
  //
  //   single port  → OFF  (max parallelism, fastest)
  //   multi port   → LOW  (mieru's own default; some reuse for stealth)
  //
  // Admins can still pin a specific level via mieru_settings.multiplexing.
  const raw = settings?.multiplexing;
  const level =
    typeof raw === "string"
      ? raw.toUpperCase()
      : typeof raw === "object" && raw !== null
        ? String((raw as Record<string, unknown>).level ?? "").toUpperCase()
        : "";
  if (MIERU_MULTIPLEXING_LEVELS.has(level)) return level;
  return bindingCount <= 1 ? "MULTIPLEXING_OFF" : "MULTIPLEXING_LOW";
}

function mieruHandshakeMode(settings: Record<string, unknown> | null): string {
  const raw = typeof settings?.handshake_mode === "string" ? settings.handshake_mode.toUpperCase() : "";
  return MIERU_HANDSHAKE_MODES.has(raw) ? raw : "HANDSHAKE_STANDARD";
}

function buildMieruSimpleUri(uuid: string, server: ServerNode): string {
  const settings = asJson(server.mieruSettings) as Record<string, unknown> | null;
  const bindings = mieruBindings(server);
  const params = new URLSearchParams();
  params.set("profile", server.name || "default");
  params.set("mtu", String(Number(settings?.mtu || 1400) || 1400));
  params.set("multiplexing", mieruMultiplexing(settings, bindings.length));
  const handshake = mieruHandshakeMode(settings);
  if (handshake !== "HANDSHAKE_STANDARD") params.set("handshake-mode", handshake);
  for (const binding of bindings) {
    params.append("port", String(binding.port ?? binding.port_range ?? binding.portRange));
    params.append("protocol", String(binding.protocol || "TCP").toUpperCase());
  }
  if (typeof settings?.traffic_pattern === "string" && settings.traffic_pattern) {
    params.set("traffic-pattern", settings.traffic_pattern);
  }
  const auth = `${encodeURIComponent(uuid)}:${encodeURIComponent(uuid)}`;
  return `mierus://${auth}@${formatHost(server.host)}?${params.toString()}`;
}

function buildMieruShadowrocketUri(uuid: string, server: ServerNode): string {
  const binding = mieruBindings(server)[0] ?? {};
  const port = Number(binding.port ?? server.serverPort);
  const transport = String(binding.protocol || server.network || "tcp").toLowerCase();
  const params = new URLSearchParams();
  params.set("udp", "1");
  params.set("transport", transport);
  const auth = `${encodeURIComponent(uuid)}:${encodeURIComponent(uuid)}`;
  return `mierus://${auth}@${formatHost(server.host)}:${port}?${params.toString()}#${encodeURIComponent(
    server.name
  )}`;
}

function buildGeneralLink(uuid: string, server: ServerNode): string | null {
  switch (protocolOf(server)) {
    case "shadowsocks":
      return buildShadowsocksUri(uuid, server);
    case "vless":
      return buildVlessUri(uuid, server);
    case "vmess":
      return buildVmessUri(uuid, server);
    case "trojan":
      return buildTrojanUri(uuid, server);
    case "hysteria2":
      return buildHysteria2Uri(uuid, server);
    case "tuic":
      return buildTuicUri(uuid, server);
    case "anytls":
      return buildAnytlsUri(uuid, server);
    case "mieru":
      return buildMieruSimpleUri(uuid, server);
    case "snell":
      return buildSnellSurgeLine(uuid, server);
    default:
      return null;
  }
}

/**
 * Snell node — exported in Surge's "name = snell, host, port, psk=..."
 * configuration line shape. Mihomo also reads this verbatim when the
 * subscription is parsed as plain text. For panels that build sing-box,
 * Snell isn't a sing-box outbound type so we still emit nothing there.
 */
function snellVersionOf(server: ServerNode): number {
  // Per-node override; falls back to 4 (the most widely-deployed default).
  const v = (server as ServerNode & { snellVersion?: number | null }).snellVersion;
  return v && v > 0 ? Number(v) : 4;
}

function buildSnellSurgeLine(uuid: string, server: ServerNode): string {
  const parts = [
    `${server.name} = snell`,
    server.host,
    String(clientPort(server)),
    `psk=${uuid}`,
    `version=${snellVersionOf(server)}`
  ];
  if (server.obfs) parts.push(`obfs=${server.obfs}`);
  if (server.obfsPassword) parts.push(`obfs-host=${server.obfsPassword}`);
  return parts.join(", ");
}

function buildShadowrocketLink(uuid: string, server: ServerNode): string | null {
  if (protocolOf(server) === "mieru") return buildMieruShadowrocketUri(uuid, server);
  return buildGeneralLink(uuid, server);
}

function buildMihomoYaml(uuid: string, servers: ServerNode[]): string {
  const lines = ["proxies:"];
  const proxyNames: string[] = [];
  for (const server of servers) {
    const protocol = protocolOf(server);
    proxyNames.push(server.name);
    lines.push(`  - name: ${yamlString(server.name)}`);
    if (protocol === "mieru") {
      const allBindings = mieruBindings(server);
      const binding = allBindings[0] ?? {};
      const settings = asJson(server.mieruSettings) as Record<string, unknown> | null;
      lines.push("    type: mieru");
      lines.push(`    server: ${yamlString(server.host)}`);
      if (binding.port) lines.push(`    port: ${Number(binding.port)}`);
      if (binding.port_range ?? binding.portRange) {
        lines.push(`    port-range: ${yamlString(binding.port_range ?? binding.portRange)}`);
      }
      lines.push(`    transport: ${yamlString(String(binding.protocol || "TCP").toUpperCase())}`);
      lines.push("    udp: true");
      lines.push(`    username: ${yamlString(uuid)}`);
      lines.push(`    password: ${yamlString(uuid)}`);
      lines.push(`    multiplexing: ${mieruMultiplexing(settings, allBindings.length)}`);
      continue;
    }
    if (protocol === "shadowsocks" && server.cipher) {
      lines.push("    type: ss");
      lines.push(`    server: ${yamlString(server.host)}`);
      lines.push(`    port: ${clientPort(server)}`);
      lines.push(`    cipher: ${yamlString(server.cipher)}`);
      lines.push(`    password: ${yamlString(uuid)}`);
      lines.push("    udp: true");
      continue;
    }
    if (protocol === "vless") {
      lines.push("    type: vless");
      lines.push(`    server: ${yamlString(server.host)}`);
      lines.push(`    port: ${clientPort(server)}`);
      lines.push(`    uuid: ${yamlString(uuid)}`);
      lines.push("    udp: true");
      lines.push(`    tls: ${server.tls ? "true" : "false"}`);
      lines.push(`    servername: ${yamlString(serverNameOf(server))}`);
      if (server.flow) lines.push(`    flow: ${yamlString(server.flow)}`);
      lines.push(`    network: ${yamlString(String(server.network || "tcp").toLowerCase())}`);
      continue;
    }
    if (protocol === "vmess") {
      lines.push("    type: vmess");
      lines.push(`    server: ${yamlString(server.host)}`);
      lines.push(`    port: ${clientPort(server)}`);
      lines.push(`    uuid: ${yamlString(uuid)}`);
      lines.push("    alterId: 0");
      lines.push("    cipher: auto");
      lines.push(`    tls: ${server.tls ? "true" : "false"}`);
      lines.push(`    network: ${yamlString(String(server.network || "tcp").toLowerCase())}`);
      continue;
    }
    if (protocol === "trojan") {
      lines.push("    type: trojan");
      lines.push(`    server: ${yamlString(server.host)}`);
      lines.push(`    port: ${clientPort(server)}`);
      lines.push(`    password: ${yamlString(uuid)}`);
      lines.push(`    sni: ${yamlString(serverNameOf(server))}`);
      lines.push("    udp: true");
      continue;
    }
    if (protocol === "hysteria2") {
      lines.push("    type: hysteria2");
      lines.push(`    server: ${yamlString(server.host)}`);
      lines.push(`    port: ${clientPort(server)}`);
      lines.push(`    password: ${yamlString(uuid)}`);
      lines.push(`    sni: ${yamlString(serverNameOf(server))}`);
      if (server.upMbps) lines.push(`    up: ${server.upMbps}`);
      if (server.downMbps) lines.push(`    down: ${server.downMbps}`);
      if (server.insecure) lines.push("    skip-cert-verify: true");
      continue;
    }
    if (protocol === "tuic") {
      lines.push("    type: tuic");
      lines.push(`    server: ${yamlString(server.host)}`);
      lines.push(`    port: ${clientPort(server)}`);
      lines.push(`    uuid: ${yamlString(uuid)}`);
      lines.push(`    password: ${yamlString(uuid)}`);
      lines.push(`    sni: ${yamlString(serverNameOf(server))}`);
      lines.push(`    congestion-controller: ${yamlString(server.congestionControl ?? "bbr")}`);
      lines.push(`    udp-relay-mode: ${yamlString(server.udpRelayMode ?? "native")}`);
      continue;
    }
    if (protocol === "snell") {
      lines.push("    type: snell");
      lines.push(`    server: ${yamlString(server.host)}`);
      lines.push(`    port: ${clientPort(server)}`);
      lines.push(`    psk: ${yamlString(uuid)}`);
      lines.push(`    version: ${snellVersionOf(server)}`);
      if (server.obfs) {
        lines.push("    obfs-opts:");
        lines.push(`      mode: ${yamlString(server.obfs)}`);
        if (server.obfsPassword) {
          lines.push(`      host: ${yamlString(server.obfsPassword)}`);
        }
      }
      continue;
    }
  }

  lines.push("proxy-groups:");
  lines.push("  - name: 节点选择");
  lines.push("    type: select");
  lines.push("    proxies:");
  for (const name of proxyNames) lines.push(`      - ${yamlString(name)}`);
  lines.push("rules:");
  lines.push("  - MATCH,节点选择");
  return `${lines.join("\n")}\n`;
}

function buildSingBoxJson(uuid: string, servers: ServerNode[]): string {
  const outbounds: SingBoxOutbound[] = servers.flatMap((server): SingBoxOutbound[] => {
    const protocol = protocolOf(server);
    if (protocol === "shadowsocks" && server.cipher) {
      return [
        {
          type: "shadowsocks",
          tag: server.name,
          server: server.host,
          server_port: clientPort(server),
          method: server.cipher,
          password: uuid
        }
      ];
    }
    if (protocol === "vless") {
      return [
        {
          type: "vless",
          tag: server.name,
          server: server.host,
          server_port: clientPort(server),
          uuid,
          flow: server.flow ?? undefined,
          packet_encoding: "xudp",
          tls: server.tls
            ? {
                enabled: true,
                server_name: serverNameOf(server),
                insecure: server.insecure ?? false
              }
            : undefined
        }
      ];
    }
    if (protocol === "vmess") {
      return [
        {
          type: "vmess",
          tag: server.name,
          server: server.host,
          server_port: clientPort(server),
          uuid,
          security: "auto",
          alter_id: 0
        }
      ];
    }
    if (protocol === "trojan") {
      return [
        {
          type: "trojan",
          tag: server.name,
          server: server.host,
          server_port: clientPort(server),
          password: uuid,
          tls: {
            enabled: true,
            server_name: serverNameOf(server),
            insecure: false
          }
        }
      ];
    }
    if (protocol === "hysteria2") {
      return [
        {
          type: "hysteria2",
          tag: server.name,
          server: server.host,
          server_port: clientPort(server),
          password: uuid,
          obfs: server.obfs
            ? { type: server.obfs, password: server.obfsPassword ?? "" }
            : undefined,
          tls: {
            enabled: true,
            server_name: serverNameOf(server),
            insecure: server.insecure ?? false
          }
        }
      ];
    }
    if (protocol === "tuic") {
      return [
        {
          type: "tuic",
          tag: server.name,
          server: server.host,
          server_port: clientPort(server),
          uuid,
          password: uuid,
          congestion_control: server.congestionControl ?? "bbr",
          udp_relay_mode: server.udpRelayMode ?? "native",
          tls: {
            enabled: true,
            server_name: serverNameOf(server),
            insecure: server.insecure ?? false
          }
        }
      ];
    }
    if (protocol === "anytls") {
      return [
        {
          type: "anytls",
          tag: server.name,
          server: server.host,
          server_port: clientPort(server),
          password: uuid,
          tls: {
            enabled: true,
            server_name: serverNameOf(server),
            insecure: server.insecure ?? false
          }
        }
      ];
    }
    return [];
  });
  const tags = outbounds.map((outbound) => outbound.tag);
  return JSON.stringify(
    {
      log: { level: "info" },
      inbounds: [
        {
          type: "mixed",
          tag: "mixed-in",
          listen: "127.0.0.1",
          listen_port: 2080
        }
      ],
      outbounds: [
        {
          type: "selector",
          tag: "节点选择",
          outbounds: tags.length > 0 ? tags : ["direct"]
        },
        ...outbounds,
        { type: "direct", tag: "direct" },
        { type: "block", tag: "block" }
      ],
      route: {
        final: "节点选择"
      }
    },
    null,
    2
  );
}

function detectFlag(query: string | undefined, userAgent: string | undefined): string {
  const provided = (query ?? "").toLowerCase();
  if (provided) return provided;
  const ua = (userAgent ?? "").toLowerCase();
  if (ua.includes("mihomo") || ua.includes("clash.meta") || ua.includes("clash")) return "clash";
  if (ua.includes("sing-box") || ua.includes("singbox")) return "sing";
  if (ua.includes("shadowrocket") || ua.includes("quantumult") || ua.includes("surge") || ua.includes("loon") || ua.includes("stash")) {
    return "shadowrocket";
  }
  if (ua.includes("v2rayng") || ua.includes("v2rayn") || ua.includes("v2box") || ua.includes("nekoray")) {
    return "v2ray";
  }
  return "";
}

@Controller("client")
export class ClientController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService
  ) {}

  @Get("subscribe")
  async subscribe(
    @Query() query: Record<string, QueryValue>,
    @Headers("user-agent") userAgent: string | undefined,
    @Res() reply: FastifyReply
  ) {
    const token = firstQueryValue(query.token);
    if (!token) return reply.code(403).type("text/plain").send("token is null");

    const user = await this.prisma.user.findUnique({ where: { token } });
    if (!user) return reply.code(403).type("text/plain").send("token is error");
    const appName = this.settings.getString("app_name", DEFAULT_APP_NAME);
    buildSubscriptionHeaders(reply, user, appName);
    if (!isUserAvailable(user)) return reply.type("text/plain").send("");

    const servers = (
      await this.prisma.serverNode.findMany({
        where: { show: true },
        orderBy: [{ sort: "asc" }, { id: "asc" }]
      })
    ).filter((server) => includesGroup(server.groupId, user.groupId));

    const flag = detectFlag(firstQueryValue(query.flag), userAgent);
    if (flag.includes("sing")) {
      return reply.type("application/json").send(buildSingBoxJson(user.uuid, servers));
    }
    if (flag.includes("clash") || flag.includes("mihomo") || flag.includes("meta") || flag.includes("stash")) {
      return reply.type("text/yaml; charset=utf-8").send(buildMihomoYaml(user.uuid, servers));
    }
    if (flag.includes("shadowrocket")) {
      const links = servers
        .map((server) => buildShadowrocketLink(user.uuid, server))
        .filter((link): link is string => Boolean(link));
      return reply.type("text/plain; charset=utf-8").send(base64(`${links.join("\r\n")}\r\n`));
    }

    const links = servers
      .map((server) => buildGeneralLink(user.uuid, server))
      .filter((link): link is string => Boolean(link));
    return reply.type("text/plain; charset=utf-8").send(base64(`${links.join("\r\n")}\r\n`));
  }

  @Get("app/getConfig")
  async appConfig(@Res() reply: FastifyReply) {
    reply.header("Content-Type", "text/yaml; charset=utf-8");
    // Provide minimal Mihomo config — clients with a token will pull the real subscribe link.
    return reply.send(`mixed-port: 7890\nallow-lan: false\nmode: rule\nproxies: []\nproxy-groups: []\nrules: []\n`);
  }

  @Get("app/getVersion")
  async appVersion() {
    return {
      data: {
        windows_version: this.settings.getString("windows_version"),
        windows_download_url: this.settings.getString("windows_download_url"),
        macos_version: this.settings.getString("macos_version"),
        macos_download_url: this.settings.getString("macos_download_url"),
        android_version: this.settings.getString("android_version"),
        android_download_url: this.settings.getString("android_download_url")
      },
      code: 200,
      message: ""
    };
  }
}
