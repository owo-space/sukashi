import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/admin.json" });

test.describe("user-side pages render", () => {
  test("dashboard shows subscription card + shortcuts", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("我的订阅")).toBeVisible();
    await expect(page.getByText("捷径")).toBeVisible();
    await expect(page.getByText("查看教程")).toBeVisible();
  });

  test("plan list reachable + filter chips work", async ({ page }) => {
    await page.goto("/plan");
    await expect(page.getByRole("heading", { name: "选择最适合您的计划" })).toBeVisible();
    await page.getByRole("button", { name: "按周期" }).click();
  });

  test("order page has table headers", async ({ page }) => {
    await page.goto("/order");
    await expect(page.getByRole("cell", { name: "订单号" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "周期" })).toBeVisible();
  });

  test("profile shows wallet + password sections", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByText("我的钱包(仅消费)")).toBeVisible();
    await expect(page.getByText("修改密码")).toBeVisible();
    await expect(page.getByText("重置订阅信息")).toBeVisible();
  });

  test("invite page shows commission stats + code table", async ({ page }) => {
    await page.goto("/invite");
    await expect(page.getByText("我的邀请").first()).toBeVisible();
    await expect(page.getByText("邀请码管理")).toBeVisible();
  });

  test("ticket page shows history + create button", async ({ page }) => {
    await page.goto("/ticket");
    await expect(page.getByText("工单历史")).toBeVisible();
    await expect(page.getByRole("link", { name: "新的工单" })).toBeVisible();
  });

  test("knowledge page reachable", async ({ page }) => {
    await page.goto("/knowledge");
    await expect(page).toHaveURL(/\/knowledge/);
  });

  test("notice page reachable", async ({ page }) => {
    await page.goto("/notice");
    await expect(page).toHaveURL(/\/notice/);
  });

  test("traffic page shows table headers", async ({ page }) => {
    await page.goto("/traffic");
    await expect(page.getByRole("cell", { name: "日期" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "上传" })).toBeVisible();
  });

  test("node status page reachable", async ({ page }) => {
    await page.goto("/node");
    await expect(page).toHaveURL(/\/node/);
  });
});
