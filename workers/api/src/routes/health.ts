import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";

export const healthRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// The database really answers (not just "the Worker runs"). 503 when it
// does not, so the daily production check and any uptime monitor see it.
export async function checkDatabase(env: Env): Promise<{ ok: boolean; ms: number; error?: string }> {
  const t = Date.now();
  try {
    const row = await env.DB.prepare("select 1 as ok").first<{ ok: number }>();
    return { ok: Number(row?.ok) === 1, ms: Date.now() - t };
  } catch (err) {
    return { ok: false, ms: Date.now() - t, error: String((err as Error)?.message || err).slice(0, 200) };
  }
}

healthRoutes.get("/", async (c) => {
  const db = await checkDatabase(c.env);
  return c.json(
    {
      success: db.ok,
      data: {
        status: db.ok ? "ok" : "degraded",
        service: "parthub-api",
        env: c.env.APP_ENV,
        database: db,
        timestamp: new Date().toISOString(),
      },
    },
    db.ok ? 200 : 503
  );
});
