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
    `SELECT u.role, u.is_active, u.token_version, s.id AS seller_id
     FROM users u LEFT JOIN sellers s ON s.user_id = u.id
     WHERE u.id = ?1`
  )
    .bind(payload.user_id)
    .first<{ role: "buyer" | "seller" | "admin"; is_active: number; token_version: number; seller_id: number | null }>();

  if (!user || !Number(user.is_active) || Number(payload.tv ?? 0) !== Number(user.token_version ?? 0)) {
    return c.json({ success: false, error: "Session expired, please sign in again" }, 401);
  }

  c.set("user_id", payload.user_id);
  c.set("user_role", user.role);
  c.set("seller_id", user.seller_id ?? null);
  return await next();
};
