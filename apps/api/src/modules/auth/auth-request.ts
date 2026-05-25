import type { FastifyRequest } from "fastify";

/**
 * V2Board's User and Admin middleware accept the auth token from either the
 * Authorization header OR an `auth_data` body/query field. The compat
 * endpoints rely on this fallback so we re-implement it here.
 */
export function extractAuthorization(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (header) return Array.isArray(header) ? header[0] : header;

  const body = request.body as Record<string, unknown> | undefined;
  if (body && typeof body === "object") {
    const fromBody = body.auth_data;
    if (typeof fromBody === "string" && fromBody) return fromBody;
  }

  const query = request.query as Record<string, unknown> | undefined;
  if (query && typeof query === "object") {
    const fromQuery = query.auth_data;
    if (typeof fromQuery === "string" && fromQuery) return fromQuery;
    if (Array.isArray(fromQuery) && fromQuery[0]) return String(fromQuery[0]);
  }

  return undefined;
}
