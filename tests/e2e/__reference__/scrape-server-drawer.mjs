// Drill into one protocol's add-drawer so we can map the legacy field list.
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const BASE = "http://localhost:13003";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const PROTOCOLS = ["Shadowsocks", "VLess", "VMess", "Trojan", "Hysteria2", "Tuic", "AnyTLS", "Mieru", "Snell"];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const r = await ctx.request.post(`${BASE}/api/v1/passport/auth/login`, {
  data: { email: "admin@sukashi.com", password: PASSWORD }
});
const token = (await r.json())?.data?.auth_data;
const page = await ctx.newPage();
await page.goto(`${BASE}/admin`);
await page.evaluate((t) => localStorage.setItem("authorization", t), token);

for (const proto of PROTOCOLS) {
  await page.goto(`${BASE}/admin#/dashboard`, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.locator('a:has-text("节点管理")').first().click();
  await page.waitForTimeout(2500);
  // click +
  const plus = page.locator('button:has(.anticon-plus)').first();
  await plus.click();
  await page.waitForTimeout(500);
  // click the protocol chip in the dropdown menu
  // Click via center bounding box — antd menu items are positioned by JS
  // so the visible-and-stable check is unreliable.
  const box = await page.evaluate((t) => {
    const items = Array.from(document.querySelectorAll(".ant-dropdown-menu-item"));
    const found = items.find((el) => el.textContent?.includes(t));
    if (!found) return null;
    const r = found.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, proto);
  if (box) await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(3000);
  const dir = "tests/e2e/__reference__/legacy/admin";
  await page.screenshot({
    path: `${dir}/server.${proto.toLowerCase()}.png`,
    fullPage: true
  });
  await writeFile(`${dir}/server.${proto.toLowerCase()}.html`, await page.content());
  process.stdout.write(`${proto} ✓\n`);
}
await browser.close();
