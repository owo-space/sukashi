import { expect, test } from "@playwright/test";

const USER_ENDPOINTS = [
  "/api/v1/user/info",
  "/api/v1/user/getSubscribe",
  "/api/v1/user/getStat",
  "/api/v1/user/notice/fetch",
  "/api/v1/user/plan/fetch",
  "/api/v1/user/order/fetch",
  "/api/v1/user/ticket/fetch",
  "/api/v1/user/knowledge/fetch",
  "/api/v1/user/invite/details",
  "/api/v1/user/stat/getTrafficLog"
];

const ADMIN_ENDPOINTS = [
  "/api/v1/admin/stat/getOverride",
  "/api/v1/admin/user/fetch",
  "/api/v1/admin/plan/fetch",
  "/api/v1/admin/server/manage/getNodes",
  "/api/v1/admin/server/group/fetch",
  "/api/v1/admin/server/route/fetch",
  "/api/v1/admin/order/fetch",
  "/api/v1/admin/payment/fetch",
  "/api/v1/admin/payment/getPaymentMethods",
  "/api/v1/admin/coupon/fetch",
  "/api/v1/admin/giftcard/fetch",
  "/api/v1/admin/ticket/fetch",
  "/api/v1/admin/knowledge/fetch",
  "/api/v1/admin/notice/fetch",
  "/api/v1/admin/config/fetch"
];

test.describe("API contract", () => {
  for (const url of [...USER_ENDPOINTS, ...ADMIN_ENDPOINTS]) {
    test(`GET ${url} returns JSON 200`, async ({ request }) => {
      const token = process.env.E2E_AUTH_TOKEN;
      expect(token, "globalSetup did not populate E2E_AUTH_TOKEN").toBeTruthy();
      const res = await request.get(url, {
        headers: { authorization: `Bearer ${token}` }
      });
      expect(res.status(), `${url} status`).toBe(200);
      const ct = res.headers()["content-type"] ?? "";
      expect(ct, `${url} content-type`).toContain("json");
      const body = await res.json();
      expect(body?.code, `${url} envelope code`).toBe(200);
    });
  }
});
