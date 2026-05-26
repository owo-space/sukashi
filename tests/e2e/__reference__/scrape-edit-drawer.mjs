// Open existing nodes' edit Drawer to capture per-protocol field layouts.
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const BASE = "http://localhost:13003";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const r = await ctx.request.post(`${BASE}/api/v1/passport/auth/login`, {
  data: { email: "admin@sukashi.com", password: PASSWORD }
});
const token = (await r.json())?.data?.auth_data;
const page = await ctx.newPage();
await page.goto(`${BASE}/admin`);
await page.evaluate((t) => localStorage.setItem("authorization", t), token);
await page.goto(`${BASE}/admin#/dashboard`, { waitUntil: "domcontentloaded" });
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.locator('a:has-text("节点管理")').first().click();
await page.waitForTimeout(2500);

// Open the row dropdown then click "编辑"
for (let row = 0; row < 2; row++) {
  // each row: find the 操作 dropdown trigger and click it
  const operationsLinks = await page.locator('a:has-text("操作"), span:has-text("操作")').all();
  if (operationsLinks.length === 0) {
    console.log("no 操作 links");
    break;
  }
  // Click via JS to bypass visibility checks
  const ok = await page.evaluate((idx) => {
    const links = Array.from(document.querySelectorAll('.ant-dropdown-trigger, a, span'))
      .filter((e) => e.textContent?.trim().startsWith('操作'));
    const t = links[idx];
    if (!t) return false;
    t.click();
    return true;
  }, row);
  if (!ok) {
    console.log("no trigger", row);
    continue;
  }
  await page.waitForTimeout(800);
  // click "编辑"
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.ant-dropdown-menu-item'));
    const found = items.find((el) => el.textContent?.includes('编辑'));
    if (found) found.click();
  });
  await page.waitForTimeout(3000);
  const proto = await page
    .evaluate(() => {
      const title = document.querySelector('.ant-drawer-title')?.textContent ?? '';
      return title;
    });
  console.log(`row ${row} drawer title: ${proto}`);
  const dir = 'tests/e2e/__reference__/legacy/admin';
  await page.screenshot({ path: `${dir}/server.edit-${row}.png`, fullPage: true });
  await writeFile(`${dir}/server.edit-${row}.html`, await page.content());
  // close drawer
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
}

await browser.close();
console.log("done");
