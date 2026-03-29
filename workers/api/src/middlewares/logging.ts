import type { MiddlewareHandler } from "hono";
import type { Env, HonoVariables } from "../types";

export const loggingMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: HonoVariables;
}> = async (c, next) => {
  const start = Date.now();
  const reqId = c.get("request_id") ?? "–";

  await next();

  const ms = Date.now() - start;
  const status = c.res.status;
  const method = c.req.method;
  const path = c.req.path;

  console.log(`[${reqId}] ${method} ${path} → ${status} (${ms}ms)`);
};
