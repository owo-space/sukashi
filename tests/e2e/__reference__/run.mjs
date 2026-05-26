// One-off: capture pixel reference for every route on the legacy UmiJS panel
// at suka.owo.as.
//   E2E_ADMIN_PASSWORD='...' node tests/e2e/__reference__/run.mjs
// Output: tests/e2e/__reference__/{user,admin}/<name>.png
//
// Routes use HASH routing under /  (user) and /admin (admin).
// Auth token lives in localStorage.authorization.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.E2E_BASE_URL ?? "https://suka.owo.as";
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@sukashi.com";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
if (!PASSWORD) throw new Error("E2E_ADMIN_PASSWORD env var required");

const USER_ROUTES = [
  ["login", "/#/login"],
  ["register", "/#/register"],
  ["forget", "/#/forget"],
  ["dashboard", "/#/dashboard"],
  ["plan", "/#/plan"],
  ["order", "/#/order"],
  ["profile", "/#/profile"],
  ["invite", "/#/invite"],
  ["ticket", "/#/ticket"],
  ["knowledge", "/#/knowledge"],
  ["notice", "/#/notice"],
  ["traffic", "/#/traffic"],
  ["wallet", "/#/wallet"]
];

const ADMIN_ROUTES = [
  ["dashboard", "/admin#/dashboard"],
  ["user", "/admin#/user"],
  ["plan", "/admin#/plan"],
  ["server", "/admin#/server"],
  ["server-group", "/admin#/server/group"],
  ["server-route", "/admin#/server/route"],
  ["order", "/admin#/order"],
  ["payment", "/admin#/payment"],
  ["coupon", "/admin#/coupon"],
  ["giftcard", "/admin#/giftcard"],
  ["ticket", "/admin#/ticket"],
  ["knowledge", "/admin#/knowledge"],
  ["notice", "/admin#/notice"],
  ["config-site", "/admin#/config/site"],
  ["config-payment", "/admin#/config/payment"],
  ["config-subscribe", "/admin#/config/subscribe"],
  ["theme", "/admin#/theme"]
];

await mkdir("tests/e2e/__reference__/user", { recursive: true });
await mkdir("tests/e2e/__reference__/admin", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 }
});

const loginRes = await ctx.request.post(`${BASE}/api/v1/passport/auth/login`, {
  data: { email: EMAIL, password: PASSWORD }
});
if (loginRes.status() !== 200) {
  throw new Error(`Login HTTP ${loginRes.status()}: ${await loginRes.text()}`);
}
const body = await loginRes.json();
const token = body?.data?.auth_data;
if (!token) throw new Error("login response missing auth_data");

const page = await ctx.newPage();
await page.goto(BASE);
await page.evaluate((t) => {
  localStorage.setItem("authorization", t);
}, token);

async function shot(group, name, path) {
  const url = `${BASE}${path}`;
  process.stdout.write(`${group}/${name}: ${url}\n`);
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch (e) {
    process.stdout.write(`  goto warn: ${e.message}\n`);
  }
  // wait until the UmiJS bundle has actually painted content into #root
  try {
    await page.waitForFunction(
      () => (document.getElementById("root")?.innerHTML.length ?? 0) > 4000,
      { timeout: 15000 }
    );
  } catch {
    process.stdout.write(`  content wait warn\n`);
  }
  await page.waitForTimeout(2000);
  await page.screenshot({
    path: `tests/e2e/__reference__/${group}/${name}.png`,
    fullPage: true
  });
}

for (const [name, path] of USER_ROUTES) await shot("user", name, path);
for (const [name, path] of ADMIN_ROUTES) await shot("admin", name, path);

await browser.close();
console.log("done");
