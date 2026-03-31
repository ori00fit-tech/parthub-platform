import type { MiddlewareHandler } from "hono";
import type { Env, HonoVariables } from "../types";
import { verifyToken } from "../utils/auth";

export const authMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: HonoVariables;
}> = async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    c.set("user_id", payload.user_id);
    c.set("user_role", payload.role);
    c.set("seller_id", payload.seller_id ?? null);
  } catch {
    return c.json({ success: false, error: "Invalid or expired token" }, 401);
  }

  return await next();
};
