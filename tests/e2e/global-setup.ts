import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { request } from "@playwright/test";

const STORAGE_PATH = "tests/e2e/.auth/admin.json";
const BASE_URL = process.env.E2E_BASE_URL ?? "https://suka.owo.as";
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@sukashi.com";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "test12345";

export default async function globalSetup() {
  const ctx = await request.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
  const res = await ctx.post("/api/v1/passport/auth/login", {
    form: { email: EMAIL, password: PASSWORD }
  });
  if (res.status() !== 200) {
    throw new Error(`Login failed: HTTP ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  const token = body?.data?.auth_data as string;
  if (!token) throw new Error("Login response missing auth_data");

  process.env.E2E_AUTH_TOKEN = token;

  const origin = new URL(BASE_URL).origin;
  const state = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [{ name: "sukashi.auth_data", value: token }]
      }
    ]
  };
  await mkdir(dirname(STORAGE_PATH), { recursive: true });
  await writeFile(STORAGE_PATH, JSON.stringify(state, null, 2));
  await ctx.dispose();
}
