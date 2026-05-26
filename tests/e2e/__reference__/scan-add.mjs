// Phase 1A: hit every shadcn-v1 admin "add" button and report which ones
// fail to open their dialog. Runs against the deployed suka-dev.owo.as so we
// hit the same JS users see.

import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "https://suka-dev.owo.as";
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@sukashi.com";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
if (!PASSWORD) throw new Error("E2E_ADMIN_PASSWORD env var required");

const PAGES = [
  ["/admin/server", /添加节点/],
  ["/admin/server-group", /添加权限组/],
  ["/admin/server-route", /添加路由/],
  ["/admin/plan", /添加订阅/],
  ["/admin/coupon", /生成优惠券/],
  ["/admin/giftcard", /生成礼品卡/],
  ["/admin/notice", /添加公告/],
  ["/admin/knowledge", /添加文章/]
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 }
});
const loginRes = await ctx.request.post(`${BASE}/api/v1/passport/auth/login`, {
  data: { email: EMAIL, password: PASSWORD }
});
const token = (await loginRes.json())?.data?.auth_data;
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("  [pageerror]", e.message.slice(0, 200)));
page.on("console", (m) => {
  if (m.type() === "error") console.log("  [console]", m.text().slice(0, 200));
});

await page.goto(BASE);
await page.evaluate((t) => localStorage.setItem("sukashi.auth_data", t), token);

for (const [path, buttonText] of PAGES) {
  process.stdout.write(`${path} ... `);
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  try {
    const btn = page.getByRole("button", { name: buttonText }).first();
    await btn.waitFor({ timeout: 4000 });
    await btn.click();
    await page.waitForTimeout(800);
    const dialogVisible = await page
      .locator('[role="dialog"]')
      .first()
      .isVisible()
      .catch(() => false);
    process.stdout.write(dialogVisible ? "✓ opened\n" : "✗ no dialog\n");
    if (dialogVisible) await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } catch (e) {
    process.stdout.write(`✗ ${e.message.split("\n")[0]}\n`);
  }
}

await browser.close();
