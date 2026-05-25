import { expect, test } from "@playwright/test";

test.describe("Auth gating (no login required)", () => {
  test("unauthenticated /dashboard redirects to /login", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/邮箱/)).toBeVisible();
    await ctx.close();
  });

  test("login form is interactable", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/login");
    await expect(page.getByText(/邮箱/)).toBeVisible();
    await expect(page.getByText(/密码/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^登录$/ })).toBeVisible();
    await ctx.close();
  });
});

test.describe("Authenticated SPA pages render", () => {
  test.use({ storageState: "tests/e2e/.auth/admin.json" });

  for (const path of ["/dashboard", "/plan", "/order", "/profile", "/invite", "/ticket", "/knowledge", "/notice", "/traffic"]) {
    test(`user page ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(path);
      await page.waitForTimeout(1200);
      const rootLen = await page.evaluate(() => document.getElementById("root")?.innerHTML.length ?? 0);
      expect(rootLen, `${path} root render`).toBeGreaterThan(100);
      expect(errors, `${path} pageerror`).toEqual([]);
    });
  }

  for (const path of [
    "/admin",
    "/admin/users",
    "/admin/plans",
    "/admin/servers",
    "/admin/orders",
    "/admin/payments",
    "/admin/coupons",
    "/admin/giftcards",
    "/admin/tickets",
    "/admin/knowledge",
    "/admin/notices",
    "/admin/settings"
  ]) {
    test(`admin page ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(path);
      await page.waitForTimeout(1200);
      const rootLen = await page.evaluate(() => document.getElementById("root")?.innerHTML.length ?? 0);
      expect(rootLen, `${path} root render`).toBeGreaterThan(100);
      expect(errors, `${path} pageerror`).toEqual([]);
    });
  }
});
