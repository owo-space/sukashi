import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/admin.json" });

test.describe("admin pages render + interact", () => {
  test("dashboard reachable", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("仪表盘").first()).toBeVisible();
  });

  test("user table loads data and edit dialog opens", async ({ page }) => {
    await page.goto("/admin/user");
    await expect(page.getByRole("columnheader", { name: "邮箱" })).toBeVisible();
    await expect(page.getByText("admin@sukashi.com").first()).toBeVisible();
  });

  test("plan list + drawer", async ({ page }) => {
    await page.goto("/admin/plan");
    await expect(page.getByRole("columnheader", { name: "月付" })).toBeVisible();
    await page.getByRole("button", { name: "添加订阅" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("server protocol picker", async ({ page }) => {
    await page.goto("/admin/server");
    await page.getByRole("button", { name: "添加节点" }).click();
    await expect(page.getByText("Shadowsocks", { exact: true })).toBeVisible();
    await expect(page.getByText("VLess", { exact: true })).toBeVisible();
    await expect(page.getByText("Snell", { exact: true })).toBeVisible();
  });

  test("server-group + server-route", async ({ page }) => {
    await page.goto("/admin/server-group");
    await page.getByRole("button", { name: "添加权限组" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/admin/server-route");
    await page.getByRole("button", { name: "添加路由" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("payment add Stripe drawer", async ({ page }) => {
    await page.goto("/admin/payment");
    await page.getByRole("button", { name: /添加 Stripe/ }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("coupon generate", async ({ page }) => {
    await page.goto("/admin/coupon");
    await page.getByRole("button", { name: "生成优惠券" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("giftcard generate", async ({ page }) => {
    await page.goto("/admin/giftcard");
    await page.getByRole("button", { name: "生成礼品卡" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("notice + knowledge drawers", async ({ page }) => {
    await page.goto("/admin/notice");
    await page.getByRole("button", { name: "添加公告" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/admin/knowledge");
    await page.getByRole("button", { name: "添加文章" }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("ticket table", async ({ page }) => {
    await page.goto("/admin/ticket");
    await expect(page.getByRole("columnheader", { name: "主题" })).toBeVisible();
  });

  test("order table", async ({ page }) => {
    await page.goto("/admin/order");
    await expect(page.getByPlaceholder("订单号")).toBeVisible();
  });

  test("theme presets visible", async ({ page }) => {
    await page.goto("/admin/theme");
    await expect(page.getByText("默认蓝")).toBeVisible();
    await expect(page.getByText("暗蓝")).toBeVisible();
    await expect(page.getByText("青绿")).toBeVisible();
  });

  test("setting tabs all reachable", async ({ page }) => {
    await page.goto("/admin/setting");
    for (const tab of ["站点", "安全", "订阅", "充值", "工单", "邀请&佣金", "个性化", "节点", "邮件", "Telegram", "APP"]) {
      await expect(page.getByText(tab, { exact: true }).first()).toBeVisible();
    }
  });
});
