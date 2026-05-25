import { createHash, randomBytes, randomUUID } from "node:crypto";

export function randomToken(): string {
  return createHash("md5")
    .update(`${randomUUID()}-${Date.now()}-${randomBytes(8).toString("hex")}`)
    .digest("hex");
}

export function randomChar(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    out += chars[(bytes[i] ?? 0) % chars.length];
  }
  return out;
}

export function generateOrderNo(): string {
  const now = new Date();
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const micro = String(Date.now()).slice(-6);
  const rand = String(Math.floor(Math.random() * 90000) + 10000);
  return `${stamp}${micro}${rand}`;
}
