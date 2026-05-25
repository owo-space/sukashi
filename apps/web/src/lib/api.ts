import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

const STORAGE_KEY_AUTH = "sukashi.auth_data";

export interface ApiEnvelope<T> {
  data: T;
  code: number;
  message: string;
  total?: number;
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
    if (token === null) {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    } else {
      localStorage.setItem(STORAGE_KEY_AUTH, token);
    }
  } catch {
    // ignore
  }
}

const baseURL = "/api/v1";

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 30_000
});

http.interceptors.request.use((config) => {
  const token = readAuthData();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      writeAuthData(null);
      const path = window.location.pathname;
      if (!path.startsWith("/login")) {
        window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Unwrap the V2Board response envelope. The legacy server returns
 * { data, code, message } for every endpoint; pages care about `data` only.
 */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await http.get<ApiEnvelope<T>>(url, config);
  return response.data.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await http.post<ApiEnvelope<T>>(url, body, config);
  return response.data.data;
}

/**
 * Variant that returns the full envelope — needed when callers need
 * `total` (paginated lists) or `code` (success flag).
 */
export async function apiGetEnvelope<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiEnvelope<T>> {
  const response = await http.get<ApiEnvelope<T>>(url, config);
  return response.data;
}

export async function apiPostEnvelope<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiEnvelope<T>> {
  const response = await http.post<ApiEnvelope<T>>(url, body, config);
  return response.data;
}
