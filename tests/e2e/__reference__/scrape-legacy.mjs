// Phase 0: scrape the working legacy Umi panel via SSH tunnel.
//
// Pre-req in another terminal:
//   ssh -fN -L 13003:localhost:3003 root@193.177.221.237
//
// Then:
//   E2E_ADMIN_PASSWORD=xxx node tests/e2e/__reference__/scrape-legacy.mjs
//
// Output:
//   tests/e2e/__reference__/legacy/<group>/<name>.png    full-page screenshot
//   tests/e2e/__reference__/legacy/<group>/<name>.html   raw DOM dump
//   tests/e2e/__reference__/legacy/<group>/<name>.add.png after clicking "添加"
//   tests/e2e/__reference__/legacy/<group>/<name>.add.html
//
// We deliberately wait long (10s of `domcontentloaded` plus a 4s settle plus a
// scroll-to-bottom) because the Umi bundle code-splits per route and the
// async chunks take a while to paint.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.LEGACY_URL ?? "http://localhost:13003";
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@sukashi.com";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
if (!PASSWORD) throw new Error("E2E_ADMIN_PASSWORD env var required");

const USER_ROUTES = [
  ["dashboard", "/#/dashboard"],
  ["plan", "/#/plan"],
  ["order", "/#/order"],
  ["profile", "/#/profile"],
  ["invite", "/#/invite"],
  ["ticket", "/#/ticket"],
  ["knowledge", "/#/knowledge"],
  ["notice", "/#/notice"],
  ["traffic", "/#/traffic"],
  ["wallet", "/#/wallet"],
  ["login", "/#/login"],
  ["register", "/#/register"],
  ["forget", "/#/forget"]
];

const ADMIN_ROUTES = [
  ["dashboard", "/admin#/dashboard", null],
  ["user", "/admin#/user", "添加用户"],
  ["plan", "/admin#/plan", "添加订阅"],
  ["server", "/admin#/server", "添加节点"],
  ["server-group", "/admin#/server/group", "添加权限组"],
  ["server-route", "/admin#/server/route", "添加路由"],
  ["order", "/admin#/order", null],
  ["payment", "/admin#/payment", "添加"],
  ["coupon", "/admin#/coupon", "生成优惠券"],
  ["giftcard", "/admin#/giftcard", "生成礼品卡"],
  ["ticket", "/admin#/ticket", null],
  ["knowledge", "/admin#/knowledge", "添加文章"],
  ["notice", "/admin#/notice", "添加公告"],
  ["config-site", "/admin#/config/site", null],
  ["config-payment", "/admin#/config/payment", null],
  ["config-subscribe", "/admin#/config/subscribe", null],
  ["theme", "/admin#/theme", null]
];

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

await ensureDir("tests/e2e/__reference__/legacy/user");
await ensureDir("tests/e2e/__reference__/legacy/admin");

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
if (!token) throw new Error("login missing auth_data");

const page = await ctx.newPage();
await page.goto(BASE);
await page.evaluate((t) => localStorage.setItem("authorization", t), token);

async function settle(page) {
  try {
    await page.waitForFunction(
      () => (document.getElementById("root")?.innerText?.length ?? 0) > 50,
      { timeout: 20000 }
    );
  } catch {
    /* swallow */
  }
  await page.waitForTimeout(4000);
  // scroll to bottom to trigger any lazy loaders
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
}

async function capture(group, name, path, addButtonText) {
  const url = `${BASE}${path}`;
  process.stdout.write(`${group}/${name}: ${url}\n`);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    // hash-only navigation between two `/admin#/...` urls is treated as
    // same-page by Playwright, so React Router never re-renders. Force a
    // fresh load.
    await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  } catch (e) {
    process.stdout.write(`  goto warn: ${e.message}\n`);
  }
  await settle(page);

  const dir = `tests/e2e/__reference__/legacy/${group}`;
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  const html = await page.content();
  await writeFile(`${dir}/${name}.html`, html);

  // try to open the add button to capture its modal/drawer too
  if (addButtonText) {
    try {
      const btn = page
        .locator(`button:has-text("${addButtonText}"), a:has-text("${addButtonText}")`)
        .first();
      await btn.waitFor({ timeout: 3000 });
      await btn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${dir}/${name}.add.png`, fullPage: true });
      const html2 = await page.content();
      await writeFile(`${dir}/${name}.add.html`, html2);
      // try to close (Escape) so next page starts clean
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    } catch (e) {
      process.stdout.write(`  add capture skipped: ${e.message}\n`);
    }
  }
}

for (const [name, path] of USER_ROUTES) {
  await capture("user", name, path);
}
for (const [name, path, addBtn] of ADMIN_ROUTES) {
  await capture("admin", name, path, addBtn);
}

await browser.close();
console.log("done");
