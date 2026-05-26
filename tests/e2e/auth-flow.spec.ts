import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@sukashi.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "test12345";

test.describe("auth flow", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("login redirects admin to admin dashboard", async ({ page }) => {
    await page.goto("/login");
    // 透かし title shows in the AuthCard
    await expect(page.getByText("透かし").first()).toBeVisible();
    await expect(page.getByPlaceholder("邮箱")).toBeVisible();
    await page.getByPlaceholder("邮箱").fill(ADMIN_EMAIL);
    await page.getByPlaceholder("密码").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /登入|登录/ }).click();
    await page.waitForURL(/\/admin/);
    await expect(page.getByText("仪表盘").first()).toBeVisible();
  });

  test("protected route redirects to /login when unauthenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?redirect=/);
  });

  test("register page renders fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByText("透かし").first()).toBeVisible();
    await expect(page.getByPlaceholder("邮箱")).toBeVisible();
  });

  test("forget page renders fields", async ({ page }) => {
    await page.goto("/forget");
    await expect(page.getByText("透かし").first()).toBeVisible();
    await expect(page.getByPlaceholder("邮箱验证码")).toBeVisible();
  });
});
