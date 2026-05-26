const STORAGE_KEY_AUTH = "sukashi.auth_data";

export interface ApiEnvelope<T> {
  data: T;
  code?: number;
  message?: string;
  total?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: number | undefined;
  readonly payload: unknown;
  constructor(message: string, status: number, code: number | undefined, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export function readAuthData(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_AUTH);
  } catch {
    return null;
  }
}

export function writeAuthData(token: string | null): void {
  try {
    if (token === null) localStorage.removeItem(STORAGE_KEY_AUTH);
    else localStorage.setItem(STORAGE_KEY_AUTH, token);
  } catch {
    /* ignore */
  }
}

const BASE_URL = "/api/v1";

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  options: { params?: Record<string, unknown>; envelope?: boolean } = {}
): Promise<ApiEnvelope<T> | T> {
  const url = new URL(path.startsWith("http") ? path : `${BASE_URL}${path}`, window.location.origin);
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  const token = readAuthData();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: method === "POST" && body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin"
  });

  if (res.status === 401) {
    writeAuthData(null);
    const pathname = window.location.pathname;
    if (!pathname.startsWith("/login")) {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`;
    }
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    payload = undefined;
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload && typeof (payload as any).message === "string"
        ? (payload as any).message
        : `HTTP ${res.status}`) ?? `HTTP ${res.status}`;
    const code = (payload as any)?.code;
    throw new ApiError(message, res.status, code, payload);
  }

  const env = (payload ?? { data: null }) as ApiEnvelope<T>;
  return options.envelope ? env : env.data;
}

export async function apiGet<T>(
  path: string,
  options: { params?: Record<string, unknown> } = {}
): Promise<T> {
  return request<T>("GET", path, undefined, options) as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  options: { params?: Record<string, unknown> } = {}
): Promise<T> {
  return request<T>("POST", path, body, options) as Promise<T>;
}

export async function apiGetEnvelope<T>(
  path: string,
  options: { params?: Record<string, unknown> } = {}
): Promise<ApiEnvelope<T>> {
  return request<T>("GET", path, undefined, { ...options, envelope: true }) as Promise<ApiEnvelope<T>>;
}

export async function apiPostEnvelope<T>(
  path: string,
  body?: unknown,
  options: { params?: Record<string, unknown> } = {}
): Promise<ApiEnvelope<T>> {
  return request<T>("POST", path, body, { ...options, envelope: true }) as Promise<ApiEnvelope<T>>;
}
