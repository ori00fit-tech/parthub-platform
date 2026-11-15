import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, fail } from "../utils/response";
import { dbFirst, dbRun } from "../utils/db";
import { readProRequest } from "../utils/pro";

// A buyer's professional account (utils/pro.ts):
//   GET  /api/v1/pro/me        status of my request (null = none)
//   POST /api/v1/pro/request   { business_name, city, ice? } — ask, or ask again after a refusal
export const proRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

proRoutes.use("*", authMiddleware);

type ProRow = { business_name: string; city: string; ice: string | null; status: string; note: string | null; requested_at: string; reviewed_at: string | null };

async function myPro(DB: D1Database, userId: number) {
  return dbFirst<ProRow>(DB, "SELECT business_name, city, ice, status, note, requested_at, reviewed_at FROM pro_accounts WHERE user_id = ?", [userId]);
}

proRoutes.get("/me", async (c) => {
  const row = await myPro(c.env.DB, c.get("user_id"));
  return ok(c, row ? { ...row, note: row.status === "rejected" ? row.note : null } : { status: null });
});

proRoutes.post("/request", async (c) => {
  if (c.get("user_role") !== "buyer") return fail(c, "Pro accounts are for buyers (garages, mechanics)", 403);
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>);
  const input = readProRequest(body);
  if (!input.ok) return fail(c, input.error);
  const userId = c.get("user_id");
  const existing = await myPro(c.env.DB, userId);
  if (existing?.status === "approved") return fail(c, "Your pro account is already approved", 409);
  if (existing?.status === "pending") return fail(c, "Your request is already being checked", 409);
  await dbRun(
    c.env.DB,
    `INSERT INTO pro_accounts (user_id, business_name, city, ice, status, note, requested_at, reviewed_at, reviewed_by)
     VALUES (?, ?, ?, ?, 'pending', NULL, datetime('now'), NULL, NULL)
     ON CONFLICT(user_id) DO UPDATE SET business_name = excluded.business_name, city = excluded.city, ice = excluded.ice,
       status = 'pending', note = NULL, requested_at = datetime('now'), reviewed_at = NULL, reviewed_by = NULL`,
    [userId, input.business_name, input.city, input.ice]
  );
  return ok(c, { ...(await myPro(c.env.DB, userId)), message: "Request sent. PartHub checks it and answers you." });
});
