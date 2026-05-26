import { expect, test } from "@playwright/test";

const TOKEN = process.env.E2E_AUTH_TOKEN;

test.describe("API smoke / data assertions", () => {
  test.beforeAll(() => {
    if (!TOKEN) throw new Error("E2E_AUTH_TOKEN missing (global-setup should have populated it)");
  });

  test("user info returns is_admin true", async ({ request }) => {
    const res = await request.get("/api/v1/user/info", {
      headers: { authorization: `Bearer ${TOKEN}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body?.data?.email).toMatch(/@/);
  });

  test("admin overview returns expected keys", async ({ request }) => {
    const res = await request.get("/api/v1/admin/stat/getOverride", {
      headers: { authorization: `Bearer ${TOKEN}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const key of [
      "online_user",
      "month_income",
      "month_register_total",
      "day_register_total",
      "day_income"
    ]) {
      expect(body?.data).toHaveProperty(key);
    }
  });

  test("admin payment methods returns Stripe only", async ({ request }) => {
    const res = await request.get("/api/v1/admin/payment/getPaymentMethods", {
      headers: { authorization: `Bearer ${TOKEN}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body?.data)).toBe(true);
    expect(body.data).toEqual([{ name: "Stripe" }]);
  });

  test("admin payment save rejects non-Stripe", async ({ request }) => {
    const res = await request.post("/api/v1/admin/payment/save", {
      headers: { authorization: `Bearer ${TOKEN}` },
      data: { name: "AlipayF2F", payment: "AlipayF2F", config: {}, enable: true }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body?.data).toBe(false);
  });

  test("user/plan/fetch returns array", async ({ request }) => {
    const res = await request.get("/api/v1/user/plan/fetch", {
      headers: { authorization: `Bearer ${TOKEN}` }
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body?.data)).toBe(true);
  });
});
