import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/admin.json" });

test.describe("admin-side pages render + load data", () => {
  test("dashboard shows quick links + hero stats", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("系统设置").first()).toBeVisible();
    await expect(page.getByText("在线人数")).toBeVisible();
    await expect(page.getByText("今日收入")).toBeVisible();
    await expect(page.getByText("今日节点流量排行")).toBeVisible();
  });

  test("user list table renders with column headers + data row", async ({ page }) => {
    await page.goto("/admin/user");
    await expect(page.getByRole("cell", { name: "邮箱", exact: true })).toBeVisible();
    await expect(page.getByText("admin@sukashi.com").first()).toBeVisible();
  });

  test("plan admin table headers", async ({ page }) => {
    await page.goto("/admin/plan");
    await expect(page.getByRole("cell", { name: "月付" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "年付" })).toBeVisible();
  });

  test("server admin shows nodes table", async ({ page }) => {
    await page.goto("/admin/server");
    await expect(page.getByRole("cell", { name: "名称" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "倍率" })).toBeVisible();
  });

  test("server-group + server-route", async ({ page }) => {
    await page.goto("/admin/server-group");
    await expect(page.getByRole("button", { name: /添加权限组/ })).toBeVisible();
    await page.goto("/admin/server-route");
    await expect(page.getByRole("button", { name: /添加路由/ })).toBeVisible();
  });

  test("order admin with filter dropdown", async ({ page }) => {
    await page.goto("/admin/order");
    await expect(page.getByPlaceholder("订单号")).toBeVisible();
    await expect(page.getByRole("button", { name: "查询" })).toBeVisible();
  });

  test("payment admin shows Stripe-only alert", async ({ page }) => {
    await page.goto("/admin/payment");
    await expect(page.getByText(/Sukashi 仅支持 Stripe/)).toBeVisible();
    await expect(page.getByRole("button", { name: /添加 Stripe/ })).toBeVisible();
  });

  test("coupon admin reachable", async ({ page }) => {
    await page.goto("/admin/coupon");
    await expect(page.getByRole("button", { name: /添加优惠券/ })).toBeVisible();
  });

  test("giftcard admin reachable", async ({ page }) => {
    await page.goto("/admin/giftcard");
    await expect(page.getByRole("button", { name: /生成礼品卡/ })).toBeVisible();
  });

  test("ticket admin shows headers", async ({ page }) => {
    await page.goto("/admin/ticket");
    await expect(page.getByRole("cell", { name: "主题" })).toBeVisible();
  });

  test("notice admin reachable", async ({ page }) => {
    await page.goto("/admin/notice");
    await expect(page.getByRole("button", { name: /添加公告/ })).toBeVisible();
  });

  test("knowledge admin reachable", async ({ page }) => {
    await page.goto("/admin/knowledge");
    await expect(page.getByRole("button", { name: /添加文章/ })).toBeVisible();
  });

  test("theme admin shows primary color picker", async ({ page }) => {
    await page.goto("/admin/theme");
    await expect(page.getByLabel("主色")).toBeVisible();
    await expect(page.getByLabel("背景图 URL")).toBeVisible();
  });

  test("setting admin tabs all visible", async ({ page }) => {
    await page.goto("/admin/setting");
    for (const tab of ["站点", "订阅", "邀请", "服务器", "邮件 (SMTP)", "Telegram", "客户端", "安全"]) {
      await expect(page.getByRole("tab", { name: tab })).toBeVisible();
    }
  });
});
