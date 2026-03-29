import type { MiddlewareHandler } from "hono";
import type { Env, HonoVariables } from "../types";

export const sellerGuard: MiddlewareHandler<{
  Bindings: Env;
  Variables: HonoVariables;
}> = async (c, next) => {
  const role = c.get("user_role");

  if (role !== "seller" && role !== "admin") {
    return c.json({ success: false, error: "Forbidden: sellers only" }, 403);
  }

  await next();
};
