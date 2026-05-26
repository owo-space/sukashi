// Phase 0 v2: scrape by clicking sidebar links from the dashboard. This
// avoids the hash-only-navigation problem and gives us the real URLs the
// legacy router maps to.
//
//   ssh -fN -L 13003:localhost:3003 root@193.177.221.237
//   E2E_ADMIN_PASSWORD=xxx node tests/e2e/__reference__/scrape-v2.mjs
//
// Output:
//   tests/e2e/__reference__/legacy/<panel>/<page>.png
//   tests/e2e/__reference__/legacy/<panel>/<page>.html
//   plus *.add.png/html when we successfully click the page's add affordance.

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const BASE = process.env.LEGACY_URL ?? "http://localhost:13003";
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@sukashi.com";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
if (!PASSWORD) throw new Error("E2E_ADMIN_PASSWORD env var required");

const ADMIN_LINKS = [
  ["仪表盘", "dashboard"],
  ["系统配置", "config-site"],
  ["支付配置", "payment"],
  ["主题配置", "theme"],
  ["节点管理", "server"],
  ["权限组管理", "server-group"],
  ["路由管理", "server-route"],
  ["订阅管理", "plan"],
  ["订单管理", "order"],
  ["优惠券管理", "coupon"],
  ["礼品卡管理", "giftcard"],
  ["用户管理", "user"],
  ["公告管理", "notice"],
  ["工单管理", "ticket"],
  ["知识库管理", "knowledge"]
];

const USER_LINKS = [
  ["仪表盘", "dashboard"],
  ["购买订阅", "plan"],
  ["节点状态", "node"],
  ["我的订单", "order"],
  ["我的邀请", "invite"],
  ["个人中心", "profile"],
  ["我的工单", "ticket"],
  ["流量明细", "traffic"],
  ["使用文档", "knowledge"]
];

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

await ensureDir("tests/e2e/__reference__/legacy/admin");
await ensureDir("tests/e2e/__reference__/legacy/user");

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 }
});

const loginRes = await ctx.request.post(`${BASE}/api/v1/passport/auth/login`, {
  data: { email: EMAIL, password: PASSWORD }
});
const token = (await loginRes.json())?.data?.auth_data;
if (!token) throw new Error("login missing auth_data");

const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0, 200)));

async function settle() {
  await page.waitForTimeout(3000);
  // try to also screenshot any open modal/drawer
}

async function capture(group, label, name) {
  process.stdout.write(`${group}/${name} via "${label}"\n`);
  const link = page.locator(`a:has-text("${label}"), li:has-text("${label}") a`).first();
  try {
    await link.waitFor({ timeout: 5000 });
    await link.click();
  } catch (e) {
    process.stdout.write(`  click failed: ${e.message}\n`);
    return null;
  }
  await settle();
  const dir = `tests/e2e/__reference__/legacy/${group}`;
  const url = page.url();
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
  await writeFile(`${dir}/${name}.html`, await page.content());
  return url;
}

// ===== admin =====
await page.goto(`${BASE}/admin`);
await page.evaluate((t) => localStorage.setItem("authorization", t), token);
await page.goto(`${BASE}/admin#/dashboard`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await settle();

const adminUrls = {};
for (const [label, name] of ADMIN_LINKS) {
  const url = await capture("admin", label, name);
  if (url) adminUrls[name] = url;
}

// try open add affordance on a few critical admin pages
async function tryAdd(name, label, clickTextOrSelector) {
  await page.goto(adminUrls[name], { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await settle();
  const dir = `tests/e2e/__reference__/legacy/admin`;
  try {
    const target = page.locator(clickTextOrSelector).first();
    await target.waitFor({ timeout: 4000 });
    await target.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/${name}.add.png`, fullPage: true });
    await writeFile(`${dir}/${name}.add.html`, await page.content());
    process.stdout.write(`  add ✓ ${name}\n`);
  } catch (e) {
    process.stdout.write(`  add ✗ ${name}: ${e.message.split("\n")[0]}\n`);
  }
}

for (const [name, sel] of [
  ["server", 'button.ant-btn:has-text("+"), button:has(.anticon-plus)'],
  ["server-group", 'button.ant-btn:has-text("+"), button:has(.anticon-plus)'],
  ["server-route", 'button.ant-btn:has-text("+"), button:has(.anticon-plus)'],
  ["plan", 'button.ant-btn:has-text("+"), button:has(.anticon-plus)'],
  ["payment", 'button.ant-btn:has-text("+"), button:has(.anticon-plus)'],
  ["coupon", 'button.ant-btn:has-text("+"), button:has(.anticon-plus)'],
  ["giftcard", 'button.ant-btn:has-text("+"), button:has(.anticon-plus)'],
  ["notice", 'button.ant-btn:has-text("+"), button:has(.anticon-plus)'],
  ["knowledge", 'button.ant-btn:has-text("+"), button:has(.anticon-plus)'],
  ["user", 'button.ant-btn:has-text("+"), button:has(.anticon-plus)']
]) {
  if (adminUrls[name]) await tryAdd(name, "add", sel);
}

// ===== user =====
const userPage = await ctx.newPage();
await userPage.goto(`${BASE}/`);
await userPage.evaluate((t) => localStorage.setItem("authorization", t), token);
await userPage.goto(`${BASE}/#/dashboard`, { waitUntil: "domcontentloaded" });
await userPage.reload({ waitUntil: "domcontentloaded" });
await userPage.waitForTimeout(3000);

for (const [label, name] of USER_LINKS) {
  process.stdout.write(`user/${name} via "${label}"\n`);
  const link = userPage.locator(`a:has-text("${label}"), li:has-text("${label}") a`).first();
  try {
    await link.waitFor({ timeout: 5000 });
    await link.click();
  } catch {
    process.stdout.write(`  click failed\n`);
    continue;
  }
  await userPage.waitForTimeout(3000);
  await userPage.screenshot({
    path: `tests/e2e/__reference__/legacy/user/${name}.png`,
    fullPage: true
  });
  await writeFile(
    `tests/e2e/__reference__/legacy/user/${name}.html`,
    await userPage.content()
  );
}

// also: user auth pages (no login required)
const guestPage = await ctx.newPage();
for (const [path, name] of [
  ["/#/login", "login"],
  ["/#/register", "register"],
  ["/#/forget", "forget"]
]) {
  await guestPage.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await guestPage.reload({ waitUntil: "domcontentloaded" });
  await guestPage.waitForTimeout(3000);
  await guestPage.screenshot({
    path: `tests/e2e/__reference__/legacy/user/${name}.png`,
    fullPage: true
  });
  await writeFile(
    `tests/e2e/__reference__/legacy/user/${name}.html`,
    await guestPage.content()
  );
}

await browser.close();
console.log("done");
