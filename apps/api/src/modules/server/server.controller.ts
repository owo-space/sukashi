import { Body, Controller, Get, Headers, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { Prisma, type ServerNode, type ServerRoute } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { pack } from "msgpackr";
import { AuthService } from "../auth/auth.service.js";
import { AdminGuard, AuthenticatedGuard } from "../auth/auth.guard.js";
import { extractAuthorization } from "../auth/auth-request.js";
import { dataResponse, toJsonSafe } from "../common/json.js";
import { unixNow as unixNowFn } from "../common/unix.js";
import { PrismaService } from "../database/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { NodeStatusService } from "./node-status.service.js";

type NodeProtocolKey = "v2node";

type SukadProtocol =
  | "shadowsocks"
  | "vless"
  | "vmess"
  | "trojan"
  | "hysteria2"
  | "tuic"
  | "anytls"
  | "mieru"
  | "snell";

type QueryValue = string | string[] | undefined;

type Delegate = {
  findMany(args?: Record<string, unknown>): Promise<unknown[]>;
  findUnique(args: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
};

const NODE_ROUTES = [
  ":adminPath/server/v2node/save",
  ":adminPath/server/v2node/drop",
  ":adminPath/server/v2node/update",
  ":adminPath/server/v2node/copy"
];

const DELEGATE_BY_PROTOCOL: Record<NodeProtocolKey, string> = {
  v2node: "serverNode"
};

const SUKAD_PROTOCOLS = new Set<SukadProtocol>([
  "anytls",
  "hysteria2",
  "shadowsocks",
  "trojan",
  "tuic",
  "vless",
  "vmess",
  "mieru",
  "snell"
]);

const PRISMA_PROTOCOL_BY_SUKAD: Record<SukadProtocol, string> = {
  anytls: "ANYTLS",
  hysteria2: "HYSTERIA2",
  shadowsocks: "SHADOWSOCKS",
  trojan: "TROJAN",
  tuic: "TUIC",
  vless: "VLESS",
  vmess: "VMESS",
  mieru: "MIERU",
  snell: "SNELL"
};

const SUKAD_PROTOCOL_BY_PRISMA = Object.fromEntries(
  Object.entries(PRISMA_PROTOCOL_BY_SUKAD).map(([sukad, prisma]) => [prisma, sukad])
) as Record<string, SukadProtocol>;

const DEFAULT_SUKAD_INSTALL_URL =
  "https://raw.githubusercontent.com/owo-space/sukad/main/script/install.sh";

function unixNow(): number {
  return unixNowFn();
}

function startOfDayUnix(): number {
  // Matches PHP's strtotime(date('Y-m-d')) — start of today in the server's
  // local timezone. Both panel and PHP V2Board use server-local TZ for
  // stat record_at, so daily rows align across migrations.
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

const ALIVE_TTL_SECONDS = 120;

function requestPath(request: FastifyRequest): string {
  return request.url.split("?")[0]?.replace(/^\/+/, "") ?? "";
}

function pathProtocol(path: string): NodeProtocolKey {
  const match = path.match(/server\/([^/]+)\//);
  if (!match) throw new Error("Missing server protocol in route");
  return match[1] as NodeProtocolKey;
}

function pathAction(path: string): string {
  return path.split("/").at(-1) ?? "";
}

function asNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
}

function asNullableString(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function asJson(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function asPrismaJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const parsed = asJson(value);
  return parsed === null ? Prisma.JsonNull : (parsed as Prisma.InputJsonValue);
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function asConfigBoolean(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }
  return false;
}

function envValue(key: string): string {
  return process.env[key]?.trim() ?? "";
}

function firstHeaderValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").split(",")[0]?.trim() ?? "";
}

function requestOrigin(request?: FastifyRequest): string {
  const explicitApiHost = envValue("PANEL_SERVER_API_URL") || envValue("PANEL_APP_URL");
  if (explicitApiHost) return explicitApiHost;
  if (!request) return "";
  const host =
    firstHeaderValue(request.headers["x-forwarded-host"]) ||
    firstHeaderValue(request.headers.host);
  if (!host) return "";
  const proto = firstHeaderValue(request.headers["x-forwarded-proto"]) || "http";
  return `${proto}://${host}`;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function buildInstallCommand(nodeId: number, request?: FastifyRequest): string {
  const apiHost = requestOrigin(request);
  const apiKey = envValue("PANEL_SERVER_TOKEN") || envValue("SERVER_TOKEN");
  const scriptUrl = envValue("SUKAD_INSTALL_URL") || DEFAULT_SUKAD_INSTALL_URL;
  return [
    "wget -N",
    shellQuote(scriptUrl),
    "&& bash install.sh --api-host",
    shellQuote(apiHost),
    "--node-id",
    String(nodeId),
    "--api-key",
    shellQuote(apiKey)
  ].join(" ");
}

function firstQueryValue(value: QueryValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
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

function normalizeSukadProtocol(value: unknown): SukadProtocol {
  const protocol = String(value ?? "vless").toLowerCase() as SukadProtocol;
  if (!SUKAD_PROTOCOLS.has(protocol)) {
    throw new Error(`Unsupported SukaD protocol: ${String(value)}`);
  }
  return protocol;
}

function toPrismaProtocol(value: unknown): string {
  return PRISMA_PROTOCOL_BY_SUKAD[normalizeSukadProtocol(value)];
}

function toSukadProtocol(value: unknown): SukadProtocol {
  const raw = String(value ?? "VLESS");
  const upper = raw.toUpperCase();
  if (SUKAD_PROTOCOL_BY_PRISMA[upper]) return SUKAD_PROTOCOL_BY_PRISMA[upper];
  return normalizeSukadProtocol(raw);
}

function defaultMieruSettings(serverPort: number, network: unknown) {
  return {
    port_bindings: [
      {
        port: serverPort,
        protocol: String(network || "TCP").toUpperCase()
      }
    ],
    mtu: 0,
    // HIGH is required for parallel-stream workloads (speed tests, multi-thread
    // downloads). mieru's own default is LOW but every example in the upstream
    // docs uses HIGH. Admins can still override per-node via mieru_settings.
    multiplexing: "MULTIPLEXING_HIGH",
    // false matches mieru's own default. Real Mihomo/sing-box clients
    // don't send a user hint by default; forcing it makes them fail the
    // handshake entirely. Password-based matching populates the session's
    // user name asynchronously — sukad's handleConn must read socks5
    // BEFORE asking for UserName(), and the v3+ sukad binary does so.
    user_hint_is_mandatory: false,
    traffic_pattern: null
  };
}

function withMieruDefaults(value: unknown, serverPort: number, network: unknown) {
  const defaults = defaultMieruSettings(serverPort, network);
  const parsed = asJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaults;
  const settings = parsed as Record<string, unknown>;
  const hasUserHint = Object.prototype.hasOwnProperty.call(
    settings,
    "user_hint_is_mandatory"
  );
  return {
    ...defaults,
    ...settings,
    port_bindings:
      Array.isArray(settings.port_bindings) && settings.port_bindings.length > 0
        ? settings.port_bindings
        : defaults.port_bindings,
    user_hint_is_mandatory: hasUserHint
      ? asConfigBoolean(settings.user_hint_is_mandatory)
      : defaults.user_hint_is_mandatory
  };
}

function includesGroup(groupId: unknown, target?: number | null): boolean {
  if (!target) return false;
  return asIdArray(groupId).includes(target);
}

@Controller()
export class ServerController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly nodeStatus: NodeStatusService,
    private readonly settings: SettingsService
  ) {}

  @Get(":adminPath/server/group/fetch")
  @UseGuards(AdminGuard)
  async fetchGroups() {
    const groups = await this.prisma.serverGroup.findMany({
      orderBy: { id: "asc" }
    });
    const [users, plans, servers] = await Promise.all([
      this.prisma.user.findMany({ select: { groupId: true } }),
      this.prisma.plan.findMany({ select: { groupId: true } }),
      this.getAllServers()
    ]);

    return dataResponse(
      groups.map((group) => ({
        ...group,
        user_count: users.filter((user) => user.groupId === group.id).length,
        plan_count: plans.filter((plan) => plan.groupId === group.id).length,
        server_count: servers.filter((server) =>
          includesGroup((server as { group_id?: unknown }).group_id, group.id)
        ).length
      }))
    );
  }

  @Post(":adminPath/server/group/save")
  @UseGuards(AdminGuard)
  async saveGroup(@Body() body: Record<string, unknown>) {
    const now = unixNow();
    const id = asNullableNumber(body.id);
    if (id) {
      return dataResponse(
        await this.prisma.serverGroup.update({
          where: { id },
          data: {
            name: String(body.name ?? ""),
            updatedAt: now
          }
        })
      );
    }
    return dataResponse(
      await this.prisma.serverGroup.create({
        data: {
          name: String(body.name ?? ""),
          createdAt: now,
          updatedAt: now
        }
      })
    );
  }

  @Post(":adminPath/server/group/drop")
  @UseGuards(AdminGuard)
  async dropGroup(@Body() body: Record<string, unknown>) {
    await this.prisma.serverGroup.delete({ where: { id: Number(body.id) } });
    return dataResponse(true);
  }

  @Get(":adminPath/server/route/fetch")
  @UseGuards(AdminGuard)
  async fetchRoutes() {
    return dataResponse(
      await this.prisma.serverRoute.findMany({ orderBy: { id: "asc" } })
    );
  }

  @Post(":adminPath/server/route/save")
  @UseGuards(AdminGuard)
  async saveRoute(@Body() body: Record<string, unknown>) {
    const now = unixNow();
    const id = asNullableNumber(body.id);
    const data = {
      remarks: String(body.remarks ?? ""),
      match: (asJson(body.match) ?? []) as Prisma.InputJsonValue,
      action: String(body.action ?? "default_out"),
      actionValue: asPrismaJson(body.action_value),
      updatedAt: now
    };
    if (id) {
      return dataResponse(await this.prisma.serverRoute.update({ where: { id }, data }));
    }
    return dataResponse(
      await this.prisma.serverRoute.create({
        data: {
          ...data,
          createdAt: now
        }
      })
    );
  }

  @Post(":adminPath/server/route/drop")
  @UseGuards(AdminGuard)
  async dropRoute(@Body() body: Record<string, unknown>) {
    await this.prisma.serverRoute.delete({ where: { id: Number(body.id) } });
    return dataResponse(true);
  }

  @Get(":adminPath/server/manage/getNodes")
  @UseGuards(AdminGuard)
  async getNodes(@Req() request: FastifyRequest) {
    return dataResponse(await this.getAllServers({ includeInstallCommand: true, request }));
  }

  @Post(":adminPath/server/manage/sort")
  @UseGuards(AdminGuard)
  async sortNodes(@Body() body: Record<string, unknown>) {
    await Promise.all(
      (Object.keys(DELEGATE_BY_PROTOCOL) as NodeProtocolKey[]).flatMap((protocol) => {
        const value = body[protocol];
        if (!value || typeof value !== "object" || Array.isArray(value)) return [];
        const delegate = this.delegate(protocol);
        return Object.entries(value).map(([id, sort]) =>
          delegate.update({
            where: { id: Number(id) },
            data: {
              sort: Number(sort),
              updatedAt: unixNow()
            }
          })
        );
      })
    );
    return dataResponse(true);
  }

  @Post(NODE_ROUTES)
  @UseGuards(AdminGuard)
  async mutateNode(@Req() request: FastifyRequest, @Body() body: Record<string, unknown>) {
    const path = requestPath(request);
    const protocol = pathProtocol(path);
    const action = pathAction(path);
    if (action === "drop") return this.dropNode(protocol, body);
    if (action === "copy") return this.copyNode(protocol, body);
    if (action === "update") return this.patchNode(protocol, body);
    return this.upsertNode(protocol, body, undefined, request);
  }

  @Get("api/v2/server/config")
  async sukadConfig(
    @Query() query: Record<string, QueryValue>,
    @Res() reply: FastifyReply
  ) {
    const tokenResult = this.ensureSukadToken(query, reply);
    if (!tokenResult) return;
    const nodeId = Number(firstQueryValue(query.node_id) ?? firstQueryValue(query.nodeId));
    if (!Number.isInteger(nodeId) || nodeId <= 0) {
      return reply.code(400).send({ error: "missing node_id" });
    }
    const node = await this.prisma.serverNode.findUnique({ where: { id: nodeId } });
    if (!node) return reply.code(404).send({ error: "node not found" });
    await this.nodeStatus.touchCheck(node.id);
    return reply.send(await this.toSukadConfig(node));
  }

  @Get([
    "api/v1/server/UniProxy/user",
    "api/v1/server/uniproxy/user",
    "server/UniProxy/user",
    "server/uniproxy/user"
  ])
  async sukadUsers(
    @Query() query: Record<string, QueryValue>,
    @Headers("x-response-format") responseFormat: string | undefined,
    @Res() reply: FastifyReply
  ) {
    const tokenResult = this.ensureSukadToken(query, reply);
    if (!tokenResult) return;
    const node = await this.queryServerNode(query);
    if (node) await this.nodeStatus.touchCheck(node.id);
    const allowedGroups = node ? asIdArray(node.groupId) : [];
    const users = await this.prisma.user.findMany({
      where: { banned: false },
      orderBy: { id: "asc" }
    });
    const now = unixNow();
    const payload = {
      users: users
        .filter((user) => {
          const expiredAt = Number(user.expiredAt ?? 0);
          if (expiredAt > 0 && expiredAt < now) return false;
          if (allowedGroups.length === 0) return true;
          return user.groupId !== null && allowedGroups.includes(user.groupId);
        })
        .map((user) => ({
          id: user.id,
          uuid: user.uuid,
          speed_limit: user.speedLimit ?? 0,
          device_limit: user.deviceLimit ?? 0
        }))
    };

    if (responseFormat?.toLowerCase() === "msgpack") {
      return reply.header("Content-Type", "application/x-msgpack").send(pack(payload));
    }
    return reply.send(payload);
  }

  @Get([
    "api/v1/server/UniProxy/alivelist",
    "api/v1/server/uniproxy/alivelist",
    "server/UniProxy/alivelist",
    "server/uniproxy/alivelist"
  ])
  async sukadAliveList(
    @Query() query: Record<string, QueryValue>,
    @Res() reply: FastifyReply
  ) {
    const tokenResult = this.ensureSukadToken(query, reply);
    if (!tokenResult) return;
    const since = unixNow() - ALIVE_TTL_SECONDS;
    const rows = await this.prisma.userAliveIp.findMany({
      where: { recordedAt: { gt: since } },
      select: { userId: true, ip: true }
    });
    const mode = this.settings.getInt("device_limit_mode", 0);
    const alive: Record<string, number> = {};
    if (mode === 1) {
      const perUser = new Map<number, Set<string>>();
      for (const row of rows) {
        let set = perUser.get(row.userId);
        if (!set) {
          set = new Set();
          perUser.set(row.userId, set);
        }
        set.add(row.ip);
      }
      for (const [userId, ips] of perUser) alive[String(userId)] = ips.size;
    } else {
      const perUser = new Map<number, number>();
      for (const row of rows) {
        perUser.set(row.userId, (perUser.get(row.userId) ?? 0) + 1);
      }
      for (const [userId, count] of perUser) alive[String(userId)] = count;
    }
    return reply.send({ alive });
  }

  @Post([
    "api/v1/server/UniProxy/push",
    "api/v1/server/uniproxy/push",
    "server/UniProxy/push",
    "server/uniproxy/push"
  ])
  async sukadTrafficPush(
    @Query() query: Record<string, QueryValue>,
    @Body() body: Record<string, [number, number]>,
    @Res() reply: FastifyReply
  ) {
    const tokenResult = this.ensureSukadToken(query, reply);
    if (!tokenResult) return;
    const node = await this.queryServerNode(query);
    if (node) await this.nodeStatus.touchPush(node.id, Object.keys(body ?? {}).length);

    const entries = Object.entries(body ?? {})
      .map(([userId, traffic]) => {
        const id = Number(userId);
        if (!Number.isInteger(id) || id <= 0) return null;
        const [upload = 0, download = 0] = Array.isArray(traffic) ? traffic : [];
        return { id, upload: BigInt(upload), download: BigInt(download) };
      })
      .filter((entry): entry is { id: number; upload: bigint; download: bigint } => entry !== null);

    // 1) Running totals on v2_user (used by isAvailable / subscription headers).
    await Promise.all(
      entries.map((entry) =>
        this.prisma.user.updateMany({
          where: { id: entry.id },
          data: {
            u: { increment: entry.upload },
            d: { increment: entry.download },
            t: unixNow()
          }
        })
      )
    );

    // 2) Daily per-user aggregate to v2_stat_user (matches V2Board's
    //    StatUserJob). The user-side 流量明细 page reads from here, keyed
    //    by (server_rate, user_id, record_at=start-of-day). Without these
    //    rows the traffic log stays empty even though running totals grow.
    if (node && entries.length > 0) {
      const recordAt = startOfDayUnix();
      const rate = Number(node.rate ?? 1);
      await this.prisma.$transaction(
        entries.map((entry) =>
          this.prisma.$executeRaw`
            INSERT INTO v2_stat_user (user_id, server_rate, u, d, record_type, record_at, created_at, updated_at)
            VALUES (${entry.id}, ${rate}, ${entry.upload}, ${entry.download}, 'd', ${recordAt}, ${unixNow()}, ${unixNow()})
            ON CONFLICT (server_rate, user_id, record_at) DO UPDATE
              SET u = v2_stat_user.u + EXCLUDED.u,
                  d = v2_stat_user.d + EXCLUDED.d,
                  updated_at = EXCLUDED.updated_at
          `
        )
      );
    }
    return reply.send(true);
  }

  @Post([
    "api/v1/server/UniProxy/alive",
    "api/v1/server/uniproxy/alive",
    "server/UniProxy/alive",
    "server/uniproxy/alive"
  ])
  async sukadAlive(
    @Query() query: Record<string, QueryValue>,
    @Body() body: Record<string, unknown>,
    @Res() reply: FastifyReply
  ) {
    const tokenResult = this.ensureSukadToken(query, reply);
    if (!tokenResult) return;
    const node = await this.queryServerNode(query);
    const nodeType = String(firstQueryValue(query.node_type) ?? "sukad");
    const nodeId = node?.id ?? 0;
    const now = unixNow();
    const cutoff = now - ALIVE_TTL_SECONDS;

    // Reset this node's view for the users it reported, then bulk insert fresh entries.
    const userIds: number[] = [];
    const inserts: { userId: number; nodeType: string; nodeId: number; ip: string; recordedAt: number }[] = [];
    for (const [userIdRaw, ipsRaw] of Object.entries(body ?? {})) {
      const userId = Number(userIdRaw);
      if (!Number.isInteger(userId) || userId <= 0) continue;
      userIds.push(userId);
      const ips = Array.isArray(ipsRaw) ? ipsRaw.map(String) : [];
      const dedup = new Set(ips.filter(Boolean));
      for (const ip of dedup) {
        inserts.push({ userId, nodeType, nodeId, ip: ip.slice(0, 128), recordedAt: now });
      }
    }

    await this.prisma.$transaction(async (tx) => {
      if (userIds.length > 0) {
        await tx.userAliveIp.deleteMany({
          where: { userId: { in: userIds }, nodeType, nodeId }
        });
      }
      // Best-effort cleanup of stale entries from any node.
      await tx.userAliveIp.deleteMany({ where: { recordedAt: { lt: cutoff } } });
      if (inserts.length > 0) {
        await tx.userAliveIp.createMany({ data: inserts, skipDuplicates: true });
      }
    });

    return reply.send(true);
  }

  @Get("user/server/fetch")
  @UseGuards(AuthenticatedGuard)
  async userServerFetch(@Req() request: FastifyRequest) {
    const authUser = await this.authService.requireUser(extractAuthorization(request));
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: authUser.id }
    });
    const expired =
      user.expiredAt !== null &&
      Number(user.expiredAt) > 0 &&
      Number(user.expiredAt) < unixNow();
    if (user.banned || expired || user.transferEnable <= user.u + user.d) {
      return dataResponse([]);
    }
    const servers = (await this.getAllServers()).filter((server) => {
      const item = server as { show?: boolean | number; group_id?: unknown };
      return Boolean(item.show) && includesGroup(item.group_id, user.groupId);
    });
    return dataResponse(servers);
  }

  private delegate(protocol: NodeProtocolKey): Delegate {
    const delegate = (this.prisma as unknown as Record<string, Delegate>)[
      DELEGATE_BY_PROTOCOL[protocol]
    ];
    if (!delegate) throw new Error(`Unsupported node protocol: ${protocol}`);
    return delegate;
  }

  private async getAllServers(options?: {
    includeInstallCommand?: boolean;
    request?: FastifyRequest;
  }) {
    const entries = await Promise.all(
      (Object.keys(DELEGATE_BY_PROTOCOL) as NodeProtocolKey[]).map(async (protocol) => {
        const rows = await this.delegate(protocol).findMany({
          orderBy: [{ sort: "asc" }, { id: "asc" }]
        });
        return Promise.all(rows.map(async (server) => {
          const safeServer = toJsonSafe(server) as Record<string, unknown>;
          const item = server as {
            parentId?: number | null;
            listenIp?: string | null;
            serverPort?: number | null;
            tlsSettings?: unknown;
            networkSettings?: unknown;
            encryptionSettings?: unknown;
            disableSni?: boolean;
            udpRelayMode?: string | null;
            zeroRttHandshake?: boolean;
            congestionControl?: string | null;
            serverKey?: string | null;
            upMbps?: number | null;
            downMbps?: number | null;
            tags?: unknown;
            obfsPassword?: string | null;
            paddingScheme?: unknown;
            mieruSettings?: unknown;
            createdAt?: number | null;
            updatedAt?: number | null;
          };
          const runtimeStatus = await this.nodeStatus.resolve(
            item.parentId ?? (safeServer.id as number)
          );
          return {
            ...safeServer,
            type: protocol,
            backend: "sukad",
            ...(options?.includeInstallCommand
              ? {
                  install_command: buildInstallCommand(
                    safeServer.id as number,
                    options.request
                  )
                }
              : {}),
            show: (server as { show?: boolean }).show ? 1 : 0,
            protocol: toSukadProtocol((server as { protocol?: unknown }).protocol),
            parent_id: item.parentId ?? null,
            listen_ip: item.listenIp ?? "0.0.0.0",
            server_port: item.serverPort ?? null,
            tls_settings: item.tlsSettings ?? null,
            network_settings: item.networkSettings ?? null,
            encryption_settings: item.encryptionSettings ?? null,
            disable_sni: item.disableSni ? 1 : 0,
            udp_relay_mode: item.udpRelayMode ?? null,
            zero_rtt_handshake: item.zeroRttHandshake ? 1 : 0,
            congestion_control: item.congestionControl ?? null,
            server_key: item.serverKey ?? null,
            up_mbps: item.upMbps ?? 0,
            down_mbps: item.downMbps ?? 0,
            tags: asStringArray(item.tags),
            obfs_password: item.obfsPassword ?? null,
            padding_scheme:
              item.paddingScheme === null || item.paddingScheme === undefined
                ? null
                : JSON.stringify(item.paddingScheme),
            mieru_settings: item.mieruSettings ?? null,
            created_at: item.createdAt ?? null,
            updated_at: item.updatedAt ?? null,
            group_id: asStringArray((server as { groupId?: unknown }).groupId),
            route_id: asStringArray((server as { routeId?: unknown }).routeId),
            available_status: runtimeStatus.availableStatus,
            is_online: runtimeStatus.availableStatus > 0 ? 1 : 0,
            last_check_at: runtimeStatus.lastCheckAt ?? null,
            last_push_at: runtimeStatus.lastPushAt ?? null,
            online: runtimeStatus.online ?? 0
          };
        }));
      })
    );
    return entries.flat();
  }

  private async upsertNode(
    protocol: NodeProtocolKey,
    body: Record<string, unknown>,
    id?: number,
    request?: FastifyRequest
  ) {
    const delegate = this.delegate(protocol);
    const data = this.nodeData(protocol, body);
    const targetId = id ?? asNullableNumber(body.id);
    const withInstallCommand = (node: unknown) => {
      const item = toJsonSafe(node) as Record<string, unknown>;
      return {
        ...item,
        install_command: buildInstallCommand(Number(item.id), request)
      };
    };
    if (targetId) {
      return dataResponse(
        withInstallCommand(await delegate.update({ where: { id: targetId }, data }))
      );
    }
    return dataResponse(
      withInstallCommand(
        await delegate.create({
          data: {
            ...data,
            createdAt: unixNow()
          }
        })
      )
    );
  }

  private async patchNode(protocol: NodeProtocolKey, body: Record<string, unknown>) {
    const id = Number(body.id);
    const data = this.nodePatchData(body);
    if (Object.keys(data).length === 0) return dataResponse(true);
    return dataResponse(
      await this.delegate(protocol).update({
        where: { id },
        data
      })
    );
  }

  private async dropNode(protocol: NodeProtocolKey, body: Record<string, unknown>) {
    await this.delegate(protocol).delete({ where: { id: Number(body.id) } });
    return dataResponse(true);
  }

  private async copyNode(protocol: NodeProtocolKey, body: Record<string, unknown>) {
    const delegate = this.delegate(protocol);
    const source = await delegate.findUnique({ where: { id: Number(body.id) } });
    if (!source) return dataResponse(false);
    const { id: _id, ...copy } = source;
    return dataResponse(
      await delegate.create({
        data: {
          ...copy,
          name: `${String(copy.name ?? "")} copy`,
          show: false,
          createdAt: unixNow(),
          updatedAt: unixNow()
        }
      })
    );
  }

  private ensureSukadToken(
    query: Record<string, QueryValue>,
    reply: FastifyReply
  ): boolean {
    const nodeType = firstQueryValue(query.node_type);
    if (nodeType && nodeType !== "sukad") {
      reply.code(400).send({ error: "unsupported node_type" });
      return false;
    }
    const expectedToken = process.env.PANEL_SERVER_TOKEN ?? process.env.SERVER_TOKEN ?? "";
    if (expectedToken && firstQueryValue(query.token) !== expectedToken) {
      reply.code(403).send({ error: "invalid token" });
      return false;
    }
    return true;
  }

  private async queryServerNode(
    query: Record<string, QueryValue>
  ): Promise<ServerNode | null> {
    const nodeId = Number(firstQueryValue(query.node_id) ?? firstQueryValue(query.nodeId));
    if (!Number.isInteger(nodeId) || nodeId <= 0) return null;
    return this.prisma.serverNode.findUnique({ where: { id: nodeId } });
  }

  private async toSukadConfig(node: ServerNode) {
    const routeIds = asIdArray(node.routeId);
    const routes =
      routeIds.length > 0
        ? await this.prisma.serverRoute.findMany({
            where: { id: { in: routeIds } },
            orderBy: { id: "asc" }
          })
        : [];
    return {
      protocol: toSukadProtocol(node.protocol),
      listen_ip: "0.0.0.0",
      server_port: node.serverPort,
      routes: routes.map((route) => this.toSukadRoute(route)),
      base_config: {
        push_interval: Number(process.env.SUKAD_PUSH_INTERVAL ?? 60),
        pull_interval: Number(process.env.SUKAD_PULL_INTERVAL ?? 60),
        device_online_min_traffic: Number(
          process.env.SUKAD_DEVICE_ONLINE_MIN_TRAFFIC ?? 0
        ),
        node_report_min_traffic: Number(process.env.SUKAD_NODE_REPORT_MIN_TRAFFIC ?? 0)
      },
      tls: node.tls,
      tls_settings: node.tlsSettings ?? {},
      network: node.network,
      network_settings: node.networkSettings ?? null,
      encryption: node.encryption,
      encryption_settings: node.encryptionSettings ?? null,
      flow: node.flow,
      cipher: node.cipher,
      server_key: node.serverKey,
      congestion_control: node.congestionControl,
      zero_rtt_handshake: node.zeroRttHandshake,
      disable_sni: node.disableSni,
      udp_relay_mode: node.udpRelayMode,
      padding_scheme: node.paddingScheme ?? null,
      mieru_settings: withMieruDefaults(
        node.mieruSettings,
        node.serverPort,
        node.network
      ),
      up_mbps: node.upMbps,
      down_mbps: node.downMbps,
      obfs: node.obfs,
      obfs_password: node.obfsPassword,
      ignore_client_bandwidth: false
    };
  }

  private toSukadRoute(route: ServerRoute) {
    return {
      id: route.id,
      match: asStringArray(route.match),
      action: route.action,
      action_value: route.actionValue
    };
  }

  private nodePatchData(body: Record<string, unknown>) {
    const data: Record<string, unknown> = {
      updatedAt: unixNow()
    };

    for (const [key, value] of Object.entries(body)) {
      if (key === "id") continue;
      switch (key) {
        case "group_id":
        case "groupId":
          data.groupId = JSON.stringify(asStringArray(value));
          break;
        case "route_id":
        case "routeId": {
          const routeIds = asStringArray(value);
          data.routeId = routeIds.length > 0 ? JSON.stringify(routeIds) : null;
          break;
        }
        case "name":
          data.name = String(value ?? "");
          break;
        case "parent_id":
        case "parentId":
          data.parentId = asNullableNumber(value);
          break;
        case "host":
          data.host = String(value ?? "");
          break;
        case "listen_ip":
        case "listenIp":
          data.listenIp = "0.0.0.0";
          break;
        case "port":
          data.port = String(value ?? "");
          break;
        case "server_port":
        case "serverPort":
          data.serverPort = Number(value ?? 0);
          break;
        case "tags":
          data.tags = asStringArray(value).length
            ? JSON.stringify(asStringArray(value))
            : null;
          break;
        case "rate":
          data.rate = String(value ?? "1");
          break;
        case "show":
          data.show = asBoolean(value);
          break;
        case "sort":
          data.sort = asNullableNumber(value);
          break;
        case "protocol":
          data.protocol = toPrismaProtocol(value);
          break;
        case "tls":
          data.tls = Number(value ?? 0);
          break;
        case "tls_settings":
        case "tlsSettings":
          data.tlsSettings = asPrismaJson(value);
          break;
        case "flow":
          data.flow = asNullableString(value);
          break;
        case "network":
          data.network = String(value ?? "tcp");
          break;
        case "network_settings":
        case "networkSettings":
          data.networkSettings = asPrismaJson(value);
          break;
        case "encryption":
          data.encryption = asNullableString(value);
          break;
        case "encryption_settings":
        case "encryptionSettings":
          data.encryptionSettings = asPrismaJson(value);
          break;
        case "disable_sni":
        case "disableSni":
          data.disableSni = asBoolean(value);
          break;
        case "udp_relay_mode":
        case "udpRelayMode":
          data.udpRelayMode = asNullableString(value);
          break;
        case "zero_rtt_handshake":
        case "zeroRttHandshake":
          data.zeroRttHandshake = asBoolean(value);
          break;
        case "congestion_control":
        case "congestionControl":
          data.congestionControl = asNullableString(value);
          break;
        case "cipher":
          data.cipher = asNullableString(value);
          break;
        case "server_key":
        case "serverKey":
          data.serverKey = asNullableString(value);
          break;
        case "up_mbps":
        case "upMbps":
          data.upMbps = Number(value ?? 0);
          break;
        case "down_mbps":
        case "downMbps":
          data.downMbps = Number(value ?? 0);
          break;
        case "obfs":
          data.obfs = asNullableString(value);
          break;
        case "obfs_password":
        case "obfsPassword":
          data.obfsPassword = asNullableString(value);
          break;
        case "padding_scheme":
        case "paddingScheme":
          data.paddingScheme = asPrismaJson(value);
          break;
        case "mieru_settings":
        case "mieruSettings":
          data.mieruSettings = asPrismaJson(value);
          break;
      }
    }

    return data;
  }

  private nodeData(protocol: NodeProtocolKey, body: Record<string, unknown>) {
    const tags = asStringArray(body.tags);
    const common = {
      groupId: JSON.stringify(asStringArray(body.group_id ?? body.groupId)),
      routeId: (() => {
        const routeIds = asStringArray(body.route_id ?? body.routeId);
        return routeIds.length > 0 ? JSON.stringify(routeIds) : null;
      })(),
      name: String(body.name ?? ""),
      parentId: asNullableNumber(body.parent_id ?? body.parentId),
      host: String(body.host ?? ""),
      port: String(body.port ?? ""),
      serverPort: Number(body.server_port ?? body.serverPort ?? body.port ?? 0),
      tags: tags.length > 0 ? JSON.stringify(tags) : null,
      rate: String(body.rate ?? "1"),
      show: asBoolean(body.show),
      sort: asNullableNumber(body.sort),
      updatedAt: unixNow()
    };

    const sukadProtocol = normalizeSukadProtocol(body.protocol);
    const network = String(body.network ?? "tcp");
    const serverPort = Number(body.server_port ?? body.serverPort ?? body.port ?? 0);

    return {
      ...common,
      listenIp: "0.0.0.0",
      protocol: PRISMA_PROTOCOL_BY_SUKAD[sukadProtocol],
      tls: Number(body.tls ?? 0),
      tlsSettings: asJson(body.tls_settings ?? body.tlsSettings),
      flow: asNullableString(body.flow),
      network,
      networkSettings: asJson(body.network_settings ?? body.networkSettings),
      encryption: asNullableString(body.encryption),
      encryptionSettings: asJson(body.encryption_settings ?? body.encryptionSettings),
      disableSni: asBoolean(body.disable_sni ?? body.disableSni),
      udpRelayMode: asNullableString(body.udp_relay_mode ?? body.udpRelayMode),
      zeroRttHandshake: asBoolean(body.zero_rtt_handshake ?? body.zeroRttHandshake),
      congestionControl: asNullableString(
        body.congestion_control ?? body.congestionControl
      ),
      cipher: asNullableString(body.cipher),
      serverKey: asNullableString(body.server_key ?? body.serverKey),
      upMbps: Number(body.up_mbps ?? body.upMbps ?? 0),
      downMbps: Number(body.down_mbps ?? body.downMbps ?? 0),
      obfs: asNullableString(body.obfs),
      obfsPassword: asNullableString(body.obfs_password ?? body.obfsPassword),
      paddingScheme: asJson(body.padding_scheme ?? body.paddingScheme),
      mieruSettings:
        sukadProtocol === "mieru"
          ? (withMieruDefaults(
              body.mieru_settings ?? body.mieruSettings,
              serverPort,
              network
            ) as Prisma.InputJsonValue)
          : asPrismaJson(body.mieru_settings ?? body.mieruSettings)
    };
  }
}
