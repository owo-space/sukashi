import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("console", (msg) => console.log("[console]", msg.type(), msg.text()));
page.on("pageerror", (e) => console.log("[pageerror]", e.message));
page.on("requestfailed", (r) => console.log("[reqfail]", r.url(), r.failure()?.errorText));
await page.goto("http://localhost:13003/admin#/dashboard", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(8000);
const text = await page.evaluate(() => document.getElementById("root")?.innerText?.slice(0, 200));
console.log("ROOT TEXT:", JSON.stringify(text));
const html = await page.content();
console.log("HTML len:", html.length);
await browser.close();
