import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { after, before, test } from "node:test";
import {
  ACTIVE_LEGACY_API_ROUTES,
  LEGACY_API_ROUTES,
  REMOVED_PROTOCOL_API_ROUTES,
  REMOVED_NODE_PROTOCOLS,
  RETAINED_NODE_PROTOCOLS,
  RETAINED_SUBSCRIPTION_FORMATS
} from "../packages/shared/dist/index.js";

let apiProcess;
let apiBaseUrl;

const FRONTEND_API_EXPLICIT_ROUTES = new Set(["GET monitor/api/stats"]);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), "utf8"));
}

async function readText(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

function addFrontendCall(calls, methodKey, path, source) {
  const method = methodKey === "a" ? "GET" : "POST";
  const normalized = path.replace(/^\/api\/v1\//, "/").replace(/^\/+/, "");
  if (!normalized || normalized === "/") return;
  const key = `${method} ${normalized}`;
  const existing = calls.get(key) ?? {
    method,
    path: normalized,
    sources: new Set()
  };
  existing.sources.add(source);
  calls.set(key, existing);
}

async function extractBundledFrontendApiCalls() {
  const calls = new Map();
  const bundlePaths = [
    "public/theme/default/assets/umi.js",
    "public/assets/admin/umi.js"
  ];

  for (const bundlePath of bundlePaths) {
    const source = await readText(bundlePath);
    for (const match of source.matchAll(
      /Object\([^\)]*\[\"([ab])\"\]\)\(\"\/\" \+ window\.settings\.secure_path \+ \"([^\"]+)\"/g
    )) {
      addFrontendCall(calls, match[1], `:adminPath${match[2]}`, bundlePath);
    }
    for (const match of source.matchAll(
      /Object\([^\)]*\[\"([ab])\"\]\)\(\(\"\/\" \+ window\.settings\.secure_path \+ \"([^\"]+)\"\)/g
    )) {
      addFrontendCall(calls, match[1], `:adminPath${match[2]}`, bundlePath);
    }
    for (const match of source.matchAll(
      /Object\([^\)]*\[\"([ab])\"\]\)\(\"([^\"]+)\"/g
    )) {
      if (match[2] === "/" || match[2].includes("window.settings.secure_path")) continue;
      addFrontendCall(calls, match[1], match[2], bundlePath);
    }
    for (const match of source.matchAll(
      /Object\([^\)]*\[\"([ab])\"\]\)\(\(null === [^\)]*?\.origin\) \+ \"([^\"]+)\"/g
    )) {
      addFrontendCall(calls, match[1], match[2], bundlePath);
    }
    if (source.includes("/monitor/api/stats")) {
      addFrontendCall(calls, "a", "/monitor/api/stats", bundlePath);
    }
  }

  return [...calls.values()].sort((left, right) =>
    `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`)
  );
}

async function waitForApi(url, processRef) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processRef.exitCode !== null) {
      throw new Error(`API exited before readiness with code ${processRef.exitCode}`);
    }
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await sleep(100);
  }
  throw lastError ?? new Error("API did not become ready");
}

before(async () => {
  const port = 4300 + Math.floor(Math.random() * 400);
  apiBaseUrl = `http://127.0.0.1:${port}`;
  apiProcess = spawn("node", ["apps/api/dist/main.js"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForApi(apiBaseUrl, apiProcess);
});

after(async () => {
  if (!apiProcess || apiProcess.exitCode !== null) return;
  apiProcess.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => apiProcess.once("exit", resolve)),
    sleep(2_000).then(() => {
      apiProcess.kill("SIGKILL");
    })
  ]);
});

test("workspace is renamed to Sukashi", async () => {
  const rootPackage = await readJson("package.json");
  const apiPackage = await readJson("apps/api/package.json");
  const webPackage = await readJson("apps/web/package.json");
  const sharedPackage = await readJson("packages/shared/package.json");

  assert.equal(rootPackage.name, "sukashi");
  assert.equal(apiPackage.name, "@sukashi/api");
  assert.equal(webPackage.name, "@sukashi/web");
  assert.equal(sharedPackage.name, "@sukashi/shared");
  assert.match(JSON.stringify(rootPackage.scripts), /@sukashi\/api/);
  assert.doesNotMatch(JSON.stringify(rootPackage.scripts), /php|artisan|composer/i);
});

test("protocol policy keeps only retained node protocols", () => {
  assert.deepEqual(RETAINED_NODE_PROTOCOLS, [
    "anytls",
    "hysteria2",
    "shadowsocks",
    "trojan",
    "tuic",
    "vless",
    "vmess",
    "mieru"
  ]);
  assert.deepEqual(RETAINED_SUBSCRIPTION_FORMATS, [
    "sing-box",
    "shadowsocks-sip008",
    "vless-uri"
  ]);
  assert.ok(REMOVED_NODE_PROTOCOLS.includes("hysteria"));
  assert.ok(!REMOVED_NODE_PROTOCOLS.includes("vmess"));
  assert.ok(!REMOVED_NODE_PROTOCOLS.includes("trojan"));
  assert.ok(!RETAINED_NODE_PROTOCOLS.some((protocol) => REMOVED_NODE_PROTOCOLS.includes(protocol)));
});

test("legacy API inventory keeps SukaD node backend active only", () => {
  const activePaths = new Set(ACTIVE_LEGACY_API_ROUTES.map((route) => route.path));
  const removedPaths = new Set(REMOVED_PROTOCOL_API_ROUTES.map((route) => route.path));

  assert.ok(LEGACY_API_ROUTES.length > 120);
  assert.ok(activePaths.has("passport/auth/login"));
  assert.ok(activePaths.has("passport/auth/register"));
  assert.ok(activePaths.has("user/info"));
  assert.ok(activePaths.has("user/tutorial/fetch"));
  assert.ok(activePaths.has("client/subscribe"));
  assert.ok(activePaths.has("server/config"));
  assert.ok(activePaths.has(":adminPath/server/v2node/save"));
  assert.ok(removedPaths.has(":adminPath/server/vless/save"));
  assert.ok(removedPaths.has(":adminPath/server/shadowsocks/save"));
  assert.ok(removedPaths.has(":adminPath/server/vmess/save"));
  assert.ok(removedPaths.has(":adminPath/server/trojan/save"));
  assert.ok(!activePaths.has(":adminPath/server/vless/save"));
  assert.ok(!activePaths.has(":adminPath/server/shadowsocks/save"));
  assert.ok(!activePaths.has(":adminPath/server/vmess/save"));
  assert.ok(!activePaths.has(":adminPath/server/trojan/save"));
});

test("legacy API inventory covers every bundled panel API call", async () => {
  const frontendCalls = await extractBundledFrontendApiCalls();
  const routeKeys = new Set();

  for (const route of LEGACY_API_ROUTES) {
    routeKeys.add(`${route.method} ${route.path}`);
    if (route.method === "ANY") {
      routeKeys.add(`GET ${route.path}`);
      routeKeys.add(`POST ${route.path}`);
    }
  }

  assert.equal(frontendCalls.length, 150);
  assert.ok(frontendCalls.some((call) => call.path === "user/tutorial/fetch"));
  assert.ok(
    frontendCalls.some(
      (call) => call.method === "GET" && call.path === "passport/auth/register"
    )
  );

  const missing = frontendCalls
    .filter((call) => {
      const key = `${call.method} ${call.path}`;
      return !routeKeys.has(key) && !FRONTEND_API_EXPLICIT_ROUTES.has(key);
    })
    .map((call) => `${call.method} ${call.path}`);

  assert.deepEqual(missing, []);
});

test("admin node add menu exposes SukaD protocol choices", async () => {
  const adminBundle = await readText("public/assets/admin/umi.js");
  const plusMenuStart = adminBundle.indexOf('overlay: y.a.createElement(p["a"], null, y.a.createElement(p["a"].Item, null, y.a.createElement(mV2node');
  const plusMenuEnd = adminBundle.indexOf('}, y.a.createElement(l["a"], null, y.a.createElement(m["a"], {', plusMenuStart);
  assert.ok(plusMenuStart > 0);
  assert.ok(plusMenuEnd > plusMenuStart);
  const plusMenu = adminBundle.slice(plusMenuStart, plusMenuEnd);

  for (const protocol of RETAINED_NODE_PROTOCOLS) {
    assert.match(plusMenu, new RegExp(`protocol: "${protocol}"`));
  }
  assert.doesNotMatch(plusMenu, /getTypeTag\("v2node", "V2node"\)/);
  assert.doesNotMatch(plusMenu, /y\.a\.createElement\(w\["a"\]/);
  assert.match(adminBundle, /e\.protocol == "mieru"/);
  assert.match(adminBundle, /mieru_user_hint_is_mandatory: 0/);
  assert.match(adminBundle, /"function" === typeof r && r\(t\.data\);/);
  assert.match(adminBundle, /e && e\.install_command/);
  assert.match(
    adminBundle,
    /onChange: e=>this\.formChange\("group_id", e\)[\s\S]{0,180}value: ""\.concat\(e\.id\)/
  );
  assert.doesNotMatch(adminBundle, /label", null, "\\u8282\\u70b9\\u534f\\u8bae"\)/);
  assert.doesNotMatch(adminBundle, /label", null, "\\u76d1\\u542c\\u5730\\u5740"\)/);
});

test("v2node update route patches only submitted fields", async () => {
  const serverController = await readText("apps/api/src/modules/server/server.controller.ts");
  assert.match(
    serverController,
    /if \(action === "update"\) return this\.patchNode\(protocol, body\);/
  );
  assert.doesNotMatch(
    serverController,
    /if \(action === "update"\) return this\.upsertNode\(protocol, body, Number\(body\.id\)\);/
  );
  assert.match(serverController, /private async patchNode/);
  assert.match(serverController, /private nodePatchData/);
  assert.match(serverController, /case "show":\s+data\.show = asBoolean\(value\);/s);
  assert.match(serverController, /show: \(server as \{ show\?: boolean \}\)\.show \? 1 : 0/);
  assert.match(serverController, /const targetId = id \?\? asNullableNumber\(body\.id\);/);
  assert.match(serverController, /where: \{ id: targetId \}/);
  assert.match(serverController, /const nodeRuntimeStatuses = new Map<number, NodeRuntimeStatus>\(\);/);
  assert.match(serverController, /function touchNodeCheck/);
  assert.match(serverController, /function touchNodePush/);
  assert.match(serverController, /available_status: runtimeStatus\.availableStatus/);
  assert.match(serverController, /is_online: runtimeStatus\.availableStatus > 0 \? 1 : 0/);
  assert.match(serverController, /last_check_at: runtimeStatus\.lastCheckAt/);
  assert.match(serverController, /last_push_at: runtimeStatus\.lastPushAt/);
  assert.match(serverController, /available_status:/);
  assert.match(serverController, /server_port: item\.serverPort \?\? null/);
  assert.match(serverController, /mieru_settings: item\.mieruSettings \?\? null/);
  assert.match(serverController, /tags: asStringArray\(item\.tags\)/);
  assert.match(serverController, /padding_scheme:[\s\S]{0,160}JSON\.stringify\(item\.paddingScheme\)/);
  assert.match(serverController, /show: false/);
  assert.match(serverController, /user_hint_is_mandatory: false/);
  assert.match(serverController, /buildInstallCommand/);
  assert.match(serverController, /install_command: buildInstallCommand/);
});

test("admin plan and user APIs preserve edit and assignment semantics", async () => {
  const planController = await readText("apps/api/src/modules/plan/plan.controller.ts");
  const userController = await readText("apps/api/src/modules/user/user.controller.ts");
  const appModule = await readText("apps/api/src/modules/app.module.ts");

  assert.match(planController, /const id = asNullableNumber\(body\.id\);/);
  assert.match(planController, /id\s+\?\s+await this\.prisma\.plan\.update/);
  assert.match(planController, /planToLegacy\(plan/);
  assert.match(planController, /private async applyPlanToUsers/);
  assert.match(planController, /where: \{ planId: plan\.id \}/);

  assert.match(userController, /export class AdminUserController/);
  assert.match(userController, /@Controller\(":adminPath\/user"\)/);
  assert.match(userController, /@Post\("update"\)/);
  assert.match(userController, /private async planAssignmentData/);
  assert.match(userController, /function planToLegacy/);
  assert.match(userController, /function legacyExpiredAt/);
  assert.match(userController, /@Get\("getSubscribe"\)/);
  assert.match(userController, /\.\.\.userToLegacy\(user, plan\)/);
  assert.match(userController, /plan: planToLegacy\(plan\)/);
  assert.match(userController, /expired_at: legacyExpiredAt\(user\.expiredAt\)/);
  assert.match(userController, /const currentUser = await this\.prisma\.user\.findUniqueOrThrow/);
  assert.match(userController, /if \(hasValue\(body\.u\)\) data\.u = asBigInt\(body\.u\);/);
  assert.match(userController, /if \(hasValue\(body\.d\)\) data\.d = asBigInt\(body\.d\);/);
  assert.match(userController, /nextPlanId !== currentUser\.planId/);
  assert.match(userController, /groupId: plan\.groupId/);
  assert.match(userController, /transferEnable: BigInt\(Math\.round\(plan\.transferEnable \* GIB\)\)/);
  assert.match(userController, /plan_name: plan\?\.name/);
  assert.match(appModule, /AdminUserController/);
});

test("user panel treats zero expiry as long-term valid", async () => {
  const userBundle = await readText("public/theme/default/assets/umi.js");
  assert.match(userBundle, /function g\(e\) \{\s+return !!e && e < \(new Date\)\.getTime\(\) \/ 1e3/);
});

test("client subscription endpoint supports real token output and Shadowrocket mieru links", async () => {
  const main = await readText("apps/api/src/main.ts");
  const appModule = await readText("apps/api/src/modules/app.module.ts");
  const compatController = await readText("apps/api/src/modules/compat/legacy-api.controller.ts");
  const clientController = await readText("apps/api/src/modules/client/client.controller.ts");

  assert.match(appModule, /ClientController/);
  assert.match(compatController, /"client\/subscribe"/);
  assert.match(main, /client\/subscribe%3F/);
  assert.match(clientController, /@Controller\("client"\)/);
  assert.match(clientController, /@Get\("subscribe"\)/);
  assert.match(clientController, /findUnique\(\{ where: \{ token \} \}\)/);
  assert.match(clientController, /buildMieruShadowrocketUri/);
  assert.match(clientController, /mierus:\/\/\$\{auth\}@\$\{formatHost\(server\.host\)\}:\$\{port\}/);
  assert.match(clientController, /params\.set\("udp", "1"\)/);
  assert.match(clientController, /params\.set\("transport", transport\)/);
  assert.match(clientController, /flag\.includes\("shadowrocket"\)/);
  assert.match(clientController, /send\(base64\(`\$\{links\.join\("\\r\\n"\)\}\\r\\n`\)\)/);
});

test("Prisma schema targets PostgreSQL and excludes removed protocol tables", async () => {
  const schema = await readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
  const initialMigration = await readFile(
    new URL("../prisma/migrations/000001_sukashi_init/migration.sql", import.meta.url),
    "utf8"
  );
  const sukadMigration = await readFile(
    new URL("../prisma/migrations/000002_sukad_mieru_protocols/migration.sql", import.meta.url),
    "utf8"
  );

  assert.match(schema, /provider = "postgresql"/);
  assert.doesNotMatch(schema, /provider = "mysql"/);
  assert.match(schema, /enum NodeProtocol/);
  assert.match(schema, /MIERU\s+@map\("mieru"\)/);
  assert.match(schema, /model ServerShadowsocks/);
  assert.match(schema, /model ServerVless/);
  assert.match(schema, /model ServerNode/);
  assert.match(schema, /mieruSettings\s+Json\?\s+@map\("mieru_settings"\)/);
  assert.doesNotMatch(schema, /model ServerVmess/);
  assert.doesNotMatch(schema, /model ServerTrojan/);
  assert.match(initialMigration, /CREATE TABLE "v2_server_v2node"/);
  assert.match(sukadMigration, /ADD VALUE IF NOT EXISTS 'mieru'/);
  assert.match(sukadMigration, /"mieru_settings" JSONB/);
  assert.doesNotMatch(initialMigration, /v2_server_vmess/);
  assert.doesNotMatch(initialMigration, /v2_server_trojan/);
});

test("Sukashi API serves no-PHP panel shell and compatibility endpoints", async () => {
  const health = await fetch(`${apiBaseUrl}/api/health`).then((response) => response.json());
  assert.deepEqual(health, {
    ok: true,
    service: "sukashi-api"
  });

  const userShell = await fetch(`${apiBaseUrl}/`).then((response) => response.text());
  const adminShell = await fetch(`${apiBaseUrl}/admin`).then((response) => response.text());
  assert.match(userShell, /<title>透かし<\/title>/);
  assert.match(adminShell, /<title>透かし<\/title>/);
  assert.match(userShell, /theme\/default\/assets\/umi\.js/);
  assert.match(adminShell, /assets\/admin\/umi\.js/);

  const policy = await fetch(`${apiBaseUrl}/api/v1/protocols/policy`).then((response) => response.json());
  assert.deepEqual(policy.retainedNodeProtocols, RETAINED_NODE_PROTOCOLS);
  assert.ok(policy.retainedNodeProtocols.includes("mieru"));
  assert.ok(policy.retainedNodeProtocols.includes("vmess"));
  assert.ok(policy.retainedNodeProtocols.includes("trojan"));

  const routes = await fetch(`${apiBaseUrl}/api/compat/routes`).then((response) => response.json());
  const activePaths = new Set(routes.data.active.map((route) => route.path));
  const removedPaths = new Set(routes.data.removed.map((route) => route.path));
  assert.equal(routes.code, 200);
  assert.ok(activePaths.has("user/info"));
  assert.ok(activePaths.has(":adminPath/server/v2node/save"));
  assert.ok(removedPaths.has(":adminPath/server/vless/save"));
  assert.ok(!activePaths.has(":adminPath/server/vless/save"));
  assert.ok(removedPaths.has(":adminPath/server/vmess/save"));
  assert.ok(!activePaths.has(":adminPath/server/vmess/save"));

  const prefixedHealth = await fetch(`${apiBaseUrl}/api/v1/health`).then((response) => response.json());
  assert.deepEqual(prefixedHealth, health);

  const prefixedCheckLogin = await fetch(`${apiBaseUrl}/api/v1/user/checkLogin`).then((response) => response.json());
  assert.equal(prefixedCheckLogin.code, 200);
  assert.deepEqual(prefixedCheckLogin.data, {
    is_login: false
  });

  const prefixedPost = await fetch(`${apiBaseUrl}/api/v1/passport/comm/pv`, {
    method: "POST"
  });
  assert.equal(prefixedPost.status, 200);
  assert.equal(prefixedPost.headers.get("content-type"), "application/json");
  const prefixedPostJson = await prefixedPost.json();
  assert.equal(prefixedPostJson.code, 200);
  assert.equal(prefixedPostJson.data, true);

  const monitorStats = await fetch(`${apiBaseUrl}/monitor/api/stats?`).then((response) => response.json());
  assert.equal(monitorStats.status, "running");
  assert.equal(monitorStats.jobsPerMinute, 0);

  const queueStats = await fetch(`${apiBaseUrl}/api/v1/admin/system/getQueueStats`).then((response) => response.json());
  assert.equal(queueStats.code, 200);
  assert.deepEqual(queueStats.data, {
    jobsPerMinute: 0,
    recentJobs: 0,
    failedJobs: 0,
    status: true
  });

  const queueWorkload = await fetch(`${apiBaseUrl}/api/v1/admin/system/getQueueWorkload`).then((response) => response.json());
  assert.equal(queueWorkload.code, 200);
  assert.ok(Array.isArray(queueWorkload.data));
  assert.ok(queueWorkload.data.some((item) => item.name === "order_handle"));

  const configFetch = await fetch(`${apiBaseUrl}/api/v1/admin/config/fetch`).then((response) => response.json());
  assert.equal(configFetch.code, 200);
  assert.equal(configFetch.data.site.app_name, "透かし");
  assert.equal(configFetch.data.site.app_description, "自由への道");
  assert.equal(configFetch.data.email.email_template, "default");
  assert.ok(Array.isArray(configFetch.data.site.email_whitelist_suffix));

  const emailTemplates = await fetch(`${apiBaseUrl}/api/v1/admin/config/getEmailTemplate`).then((response) => response.json());
  assert.deepEqual(emailTemplates.data, ["default"]);

  const themeTemplates = await fetch(`${apiBaseUrl}/api/v1/admin/config/getThemeTemplate`).then((response) => response.json());
  assert.deepEqual(themeTemplates.data, ["default"]);

  const themes = await fetch(`${apiBaseUrl}/api/v1/admin/theme/getThemes`).then((response) => response.json());
  assert.equal(themes.code, 200);
  assert.equal(themes.data.active, "default");
  assert.deepEqual(Object.keys(themes.data.themes), ["default"]);
  assert.equal(themes.data.themes.default.name, "透かし");
  assert.equal(themes.data.themes.default.description, "自由への道");
  assert.ok(themes.data.themes.default.configs.length >= 5);
  assert.equal(themes.data.themes.default.configs[0].field_name, "theme_color");

  const themeConfig = await fetch(`${apiBaseUrl}/api/v1/admin/theme/getThemeConfig`, {
    method: "POST"
  }).then((response) => response.json());
  assert.equal(themeConfig.code, 200);
  assert.deepEqual(themeConfig.data, {
    theme_color: "default",
    background_url: "",
    theme_sidebar: "light",
    theme_header: "dark",
    custom_html: ""
  });

  const tutorialIndex = await fetch(`${apiBaseUrl}/api/v1/user/tutorial/fetch`).then((response) => response.json());
  assert.equal(tutorialIndex.code, 200);
  assert.deepEqual(tutorialIndex.data, {
    tutorials: [],
    safe_area_var: {}
  });

  const tutorialDetail = await fetch(`${apiBaseUrl}/api/v1/user/tutorial/fetch?id=1`).then((response) => response.json());
  assert.equal(tutorialDetail.code, 200);
  assert.deepEqual(tutorialDetail.data, {
    id: 1,
    title: "",
    steps: "[]",
    safe_area_var: {}
  });

  const inviteFetch = await fetch(`${apiBaseUrl}/api/v1/user/invite/fetch`).then((response) => response.json());
  assert.equal(inviteFetch.code, 200);
  assert.deepEqual(inviteFetch.data, {
    codes: [],
    stat: []
  });

  const inviteDetails = await fetch(`${apiBaseUrl}/api/v1/user/invite/details`).then((response) => response.json());
  assert.equal(inviteDetails.code, 200);
  assert.deepEqual(inviteDetails.data, []);
  assert.equal(inviteDetails.total, 0);

  const removedProtocolResponse = await fetch(`${apiBaseUrl}/admin/server/vmess/save`, {
    method: "POST"
  });
  assert.equal(removedProtocolResponse.status, 404);
});
