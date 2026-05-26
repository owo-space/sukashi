import { chromium } from "@playwright/test";

const BASE = "http://localhost:13003";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const loginRes = await ctx.request.post(`${BASE}/api/v1/passport/auth/login`, {
  data: { email: "admin@sukashi.com", password: PASSWORD }
});
const token = (await loginRes.json())?.data?.auth_data;
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 400)));
await page.goto(BASE);
await page.evaluate((t) => localStorage.setItem("authorization", t), token);
await page.goto(BASE + "/admin#/dashboard", { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
console.log("--- on dashboard");
// click on "节点管理"
const link = page.locator('a:has-text("节点管理")').first();
await link.waitFor({ timeout: 5000 });
await link.click();
await page.waitForTimeout(5000);
console.log("URL:", page.url());
console.log("ROOT (first 300):", (await page.evaluate(() => document.getElementById("root")?.innerText?.slice(0, 300))));
await page.screenshot({ path: "tests/e2e/__reference__/legacy/admin/server-clicked.png", fullPage: true });
await browser.close();
