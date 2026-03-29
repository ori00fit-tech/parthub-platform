import type { MiddlewareHandler } from "hono";
import type { Env, HonoVariables } from "../types";

export const adminGuard: MiddlewareHandler<{
  Bindings: Env;
  Variables: HonoVariables;
}> = async (c, next) => {
  const role = c.get("user_role");

  if (role !== "admin") {
    return c.json({ success: false, error: "Forbidden: admins only" }, 403);
  }

  await next();
};
