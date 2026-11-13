import type { MiddlewareHandler } from "hono";
import type { Env, HonoVariables } from "../types";
import { verifyToken } from "../utils/auth";

// Checks the session token, then the account itself (one D1 read): a
// deactivated account, or a token issued before the user signed out
// (users.token_version, migrations/0021), is refused at once. The role and
// the store come from the database, not from the token, so a changed role
// applies immediately.
export const authMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: HonoVariables;
}> = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  let payload;
  try {
    payload = await verifyToken(authHeader.slice(7), c.env.JWT_SECRET);
  } catch {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }

  const user = await c.env.DB.prepare(
    `SELECT u.role, u.is_active, u.token_version, u.locale, s.id AS seller_id,
            ss.id AS sid, ss.revoked_at, ss.expires_at, ss.last_used_at
     FROM users u LEFT JOIN sellers s ON s.user_id = u.id
     LEFT JOIN sessions ss ON ss.id = ?2 AND ss.user_id = u.id
     WHERE u.id = ?1`
  )
    .bind(payload.user_id, payload.sid ?? "")
    .first<{
      role: "buyer" | "seller" | "admin"; is_active: number; token_version: number; locale: string | null; seller_id: number | null;
      sid: string | null; revoked_at: string | null; expires_at: string | null; last_used_at: string | null;
    }>();

  if (!user || !Number(user.is_active) || Number(payload.tv ?? 0) !== Number(user.token_version ?? 0)) {
    return c.json({ success: false, error: "Session expired, please sign in again" }, 401);
  }
  // A token of a device that was signed out (utils/sessions.ts). Tokens
  // made before devices existed have no sid and keep working until they expire.
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  if (payload.sid && (!user.sid || user.revoked_at || (user.expires_at && user.expires_at <= now))) {
    return c.json({ success: false, error: "Session expired, please sign in again" }, 401);
  }
  // "Last used" on the devices list, written at most once an hour.
  if (user.sid && (!user.last_used_at || user.last_used_at < new Date(Date.now() - 3600_000).toISOString().slice(0, 19).replace("T", " "))) {
    await c.env.DB.prepare("UPDATE sessions SET last_used_at = datetime('now') WHERE id = ?1").bind(user.sid).run().catch(() => undefined);
  }

  // The language the person uses PartHub in (sent by the sites): their
  // WhatsApp messages go out in it (utils/wa-notify.ts). Written only when
  // it changes.
  const lang = String(c.req.header("X-PartHub-Lang") || "").slice(0, 2).toLowerCase();
  if ((lang === "ar" || lang === "fr" || lang === "en") && lang !== user.locale) {
    await c.env.DB.prepare("UPDATE users SET locale = ?1 WHERE id = ?2").bind(lang, payload.user_id).run().catch(() => undefined);
  }

  c.set("user_id", payload.user_id);
  c.set("session_id", user.sid ?? null);
  c.set("user_role", user.role);
  c.set("seller_id", user.seller_id ?? null);
  return await next();
};
