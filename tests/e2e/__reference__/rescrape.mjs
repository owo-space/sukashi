// Re-scrape specific admin pages with longer waits because the umi bundle
// is slow to paint on certain routes.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.E2E_BASE_URL ?? "https://suka.owo.as";
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@sukashi.com";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
if (!PASSWORD) throw new Error("E2E_ADMIN_PASSWORD env var required");

const PAGES = [
  ["admin", "server", "/admin#/server"],
  ["admin", "server-group", "/admin#/server/group"],
  ["admin", "server-route", "/admin#/server/route"],
  ["admin", "config-site", "/admin#/config/site"],
  ["admin", "config-payment", "/admin#/config/payment"],
  ["admin", "config-subscribe", "/admin#/config/subscribe"],
  ["admin", "theme", "/admin#/theme"],
  ["admin", "payment", "/admin#/payment"],
  ["user", "login", "/#/login"],
  ["user", "forget", "/#/forget"],
  ["user", "register", "/#/register"],
  ["user", "notice", "/#/notice"],
  ["user", "wallet", "/#/wallet"]
];

await mkdir("tests/e2e/__reference__/admin", { recursive: true });
await mkdir("tests/e2e/__reference__/user", { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 }
});
const loginRes = await ctx.request.post(`${BASE}/api/v1/passport/auth/login`, {
  data: { email: EMAIL, password: PASSWORD }
});
const body = await loginRes.json();
const token = body?.data?.auth_data;
if (!token) throw new Error("login failed");
const page = await ctx.newPage();
await page.goto(BASE);
await page.evaluate((t) => localStorage.setItem("authorization", t), token);

for (const [group, name, path] of PAGES) {
  process.stdout.write(`${group}/${name}: ${path}\n`);
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 });
  try {
    await page.waitForFunction(
      () => (document.getElementById("root")?.innerHTML.length ?? 0) > 6000,
      { timeout: 30000 }
    );
  } catch {
    process.stdout.write("  content wait timeout\n");
  }
  await page.waitForTimeout(5000);
  await page.screenshot({
    path: `tests/e2e/__reference__/${group}/${name}.png`,
    fullPage: true
  });
}

await browser.close();
console.log("done");
