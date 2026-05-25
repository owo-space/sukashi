import { expect, test } from "@playwright/test";

test.describe("SPA shell", () => {
  test("serves the React root and injects bootstrap settings", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/透かし|sukashi/i);
    await expect(page.locator("#root")).toBeAttached();
    const bootstrap = await page.evaluate(() => (window as unknown as { __SUKASHI_BOOTSTRAP__?: unknown }).__SUKASHI_BOOTSTRAP__);
    expect(bootstrap).toBeTruthy();
  });

  test.describe.parallel("client-side routes serve shell", () => {
    for (const path of [
      "/login",
      "/register",
      "/forget",
      "/dashboard",
      "/plan",
      "/order",
      "/profile",
      "/invite",
      "/ticket",
      "/knowledge",
      "/notice",
      "/traffic",
      "/admin",
      "/admin/users"
    ]) {
      test(`GET ${path}`, async ({ request }) => {
        const res = await request.get(path);
        expect(res.status()).toBe(200);
        const body = await res.text();
        expect(body).toContain('id="root"');
      });
    }
  });

  test("favicon and bundled JS asset return 200", async ({ request }) => {
    const shell = await (await request.get("/")).text();
    const match = shell.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
    expect(match).not.toBeNull();
    const js = await request.get(match![0]);
    expect(js.status()).toBe(200);
    expect(js.headers()["content-type"]).toContain("javascript");

    const favicon = await request.get("/favicon.svg");
    expect(favicon.status()).toBe(200);
  });
});
