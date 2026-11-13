// ============================================================
// Admin audit log (migrations/0031): who changed what from the admin.
// A middleware on the admin routes records every POST / PUT / PATCH /
// DELETE before it runs (refused if it cannot be recorded), then its
// answer's status: the admin, the route, the record (from the path), the
// request body with secrets removed. Generic
// on purpose: a new admin route is logged without anyone thinking of it.
// Read with GET /api/v1/admin/audit-log (Admin › Activity log).
// ============================================================
import type { MiddlewareHandler } from "hono";
import { matchedRoutes } from "hono/route";
import type { Env, HonoVariables } from "../types";
import { clientIp } from "./rate-limit";

const SECRET_KEY = /pass(word)?|secret|token|api[_-]?key|authorization|cookie|pin/i;
const MAX_BODY = 2000;

// Removes secrets, at any depth.
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "…";
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = SECRET_KEY.test(k) ? "[removed]" : redact(v, depth + 1);
    return out;
  }
  return value;
}

// "/api/v1/admin/sellers/:id/status" + "/api/v1/admin/sellers/12/status" → sellers, "12"
export function auditTarget(route: string, path: string): { type: string | null; id: string | null } {
  const r = route.replace(/^\/api\/v1\/admin\/?/, "").split("/");
  const p = path.replace(/^\/api\/v1\/admin\/?/, "").split("/");
  const type = r[0] || null;
  const at = r.findIndex((x) => x.startsWith(":"));
  return { type, id: at >= 0 ? decodeURIComponent(p[at] || "") || null : null };
}

export const auditAdminChanges: MiddlewareHandler<{ Bindings: Env; Variables: HonoVariables }> = async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
  let body: string | null = null;
  try {
    const raw = await c.req.raw.clone().text();
    if (raw) {
      let parsed: unknown = raw;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // not JSON (a file upload, a form): keep the size only
        parsed = `[${raw.length} bytes]`;
      }
      body = JSON.stringify(redact(parsed)).slice(0, MAX_BODY);
    }
  } catch {
    body = null;
  }
  // Written BEFORE the change: if the log cannot be written, the change is
  // refused (an admin action must never go unrecorded). The result is
  // filled in after; status 0 = the change started but its answer was not
  // recorded (it crashed, or the update below failed).
  const path = new URL(c.req.url).pathname;
  // The handler's own pattern (the last matched route that is not a middleware).
  const route = matchedRoutes(c).filter((r) => r.method !== "ALL").at(-1)?.path || path;
  const target = auditTarget(route, path);
  let logId: number;
  try {
    const res = await c.env.DB.prepare(
      `INSERT INTO admin_audit_log (admin_id, method, route, path, target_type, target_id, body, status, ip)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8)`
    ).bind(Number(c.get("user_id")), method, route, path, target.type, target.id, body, clientIp(c.req.raw.headers)).run();
    logId = Number(res.meta?.last_row_id);
  } catch (err) {
    console.error(`[audit] ${err instanceof Error ? err.message : String(err)}`);
    return c.json({ success: false, error: "This action could not be recorded, so it was not done. Try again." }, 503);
  }
  await next();
  try {
    await c.env.DB.prepare("UPDATE admin_audit_log SET status = ?2 WHERE id = ?1").bind(logId, c.res.status).run();
  } catch (err) {
    console.error(`[audit] result of #${logId}: ${err instanceof Error ? err.message : String(err)}`);
  }
};
