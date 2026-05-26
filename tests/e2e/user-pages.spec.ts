import { expect, test } from "@playwright/test";

test.use({ storageState: "tests/e2e/.auth/admin.json" });

test.describe("user pages render", () => {
  test("dashboard 我的订阅 + 捷径", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText("我的订阅")).toBeVisible();
    await expect(page.getByText("捷径")).toBeVisible();
    await expect(page.getByText("查看教程")).toBeVisible();
  });

  test("plan filter pill works", async ({ page }) => {
    await page.goto("/plan");
    await expect(page.getByRole("heading", { name: "选择最适合您的计划" })).toBeVisible();
    await page.getByRole("button", { name: "按周期", exact: true }).click();
  });

  test("order table", async ({ page }) => {
    await page.goto("/order");
    await expect(page.getByRole("columnheader", { name: "订单号" })).toBeVisible();
  });

  test("profile cards", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByText("我的钱包").first()).toBeVisible();
    await expect(page.getByText("修改密码")).toBeVisible();
    await expect(page.getByText("重置订阅信息").first()).toBeVisible();
  });

  test("invite cards", async ({ page }) => {
    await page.goto("/invite");
    await expect(page.getByText("我的邀请").first()).toBeVisible();
    await expect(page.getByText("邀请码管理")).toBeVisible();
  });

  test("ticket history", async ({ page }) => {
    await page.goto("/ticket");
    await expect(page.getByText("工单历史")).toBeVisible();
    await expect(page.getByRole("link", { name: "新的工单" })).toBeVisible();
  });

  test("traffic", async ({ page }) => {
    await page.goto("/traffic");
    await expect(page.getByRole("columnheader", { name: "日期" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "上传" })).toBeVisible();
  });

  test("node status protocol chip", async ({ page }) => {
    await page.goto("/node");
    await expect(page.getByRole("columnheader", { name: "协议" })).toBeVisible();
  });

  test("knowledge search bar", async ({ page }) => {
    await page.goto("/knowledge");
    await expect(page.getByPlaceholder("搜索文档")).toBeVisible();
  });
});
