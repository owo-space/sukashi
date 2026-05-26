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
page.on("response", async (r) => {
  const u = r.url();
  if (u.includes("/api/v1/") && !u.includes("/passport")) {
    console.log(r.status(), r.request().method(), u.replace(BASE, ""));
  }
});
await page.goto(BASE);
await page.evaluate((t) => localStorage.setItem("authorization", t), token);
await page.goto(BASE + "/admin#/server", { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(6000);
console.log("---");
console.log("ROOT:", (await page.evaluate(() => document.getElementById("root")?.innerText?.slice(0, 200))));
await browser.close();
