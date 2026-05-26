import { chromium } from "@playwright/test";

const BASE = "http://localhost:13003";
const EMAIL = "admin@sukashi.com";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const loginRes = await ctx.request.post(`${BASE}/api/v1/passport/auth/login`, {
  data: { email: EMAIL, password: PASSWORD }
});
const body = await loginRes.json();
const token = body?.data?.auth_data;

const page = await ctx.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") {
    console.log("[console]", msg.type(), msg.text().slice(0, 200));
  }
});
page.on("pageerror", (e) => console.log("[pageerror]", e.message.slice(0, 200)));
await page.goto(BASE);
await page.evaluate((t) => localStorage.setItem("authorization", t), token);

const target = process.argv[2] ?? "/admin#/server";
console.log("navigate:", target);
await page.goto(BASE + target, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(8000);
const text = await page.evaluate(() => document.getElementById("root")?.innerText?.slice(0, 400));
console.log("ROOT TEXT:", JSON.stringify(text));
console.log("HTML LEN:", (await page.content()).length);
await browser.close();
