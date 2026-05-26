/**
 * Build a Gravatar URL for the given email. Gravatar now accepts SHA-256
 * (the legacy MD5 still works but SHA-256 is built into the browser).
 *
 *   https://docs.gravatar.com/api/avatars/hash/
 *
 * `d=identicon` falls back to a stable generated geometric avatar when the
 * user has no Gravatar account.
 */
export async function gravatarUrl(email: string, size = 64): Promise<string> {
  const norm = (email ?? "").trim().toLowerCase();
  if (!norm) return "";
  const enc = new TextEncoder().encode(norm);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `https://gravatar.com/avatar/${hex}?d=identicon&s=${size}`;
}
