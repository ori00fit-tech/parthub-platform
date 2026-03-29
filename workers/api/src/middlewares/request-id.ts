import type { MiddlewareHandler } from "hono";
import type { Env, HonoVariables } from "../types";

export const requestIdMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: HonoVariables;
}> = async (c, next) => {
  const id =
    c.req.header("X-Request-ID") ??
    crypto.randomUUID().slice(0, 8).toUpperCase();

  c.set("request_id", id);
  c.header("X-Request-ID", id);

  await next();
};
