import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";

export const healthRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

healthRoutes.get("/", (c) =>
  c.json({
    success: true,
    data: {
      status: "ok",
      service: "parthub-api",
      env: c.env.APP_ENV,
      timestamp: new Date().toISOString(),
    },
  })
);
