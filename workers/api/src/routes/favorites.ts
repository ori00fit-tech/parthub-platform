import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, fail } from "../utils/response";
import { dbAll, dbFirst, dbRun } from "../utils/db";
import { isApprovedPro, showProPrice } from "../utils/pro";

// Favorites (migrations/0041): parts a buyer saved, on the account.
//   GET    /api/v1/favorites          the parts (still on sale or not)
//   GET    /api/v1/favorites/ids      only their ids (the hearts on the pages)
//   PUT    /api/v1/favorites/:partId  save (a part on sale)
//   DELETE /api/v1/favorites/:partId  remove
export const favoritesRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

export const MAX_FAVORITES = 200;

favoritesRoutes.use("*", authMiddleware);

favoritesRoutes.get("/", async (c) => {
  const userId = c.get("user_id");
  const rows = await dbAll<Record<string, unknown>>(
    c.env.DB,
    `SELECT p.id, p.slug, p.title, p.price, p.compare_price, p.pro_price, p.condition, p.quantity,
            s.name AS seller_name, s.slug AS seller_slug, s.location AS seller_location,
            CASE WHEN p.status = 'active' AND s.status = 'active' THEN 1 ELSE 0 END AS available,
            (SELECT pi.url FROM part_images pi WHERE pi.part_id = p.id ORDER BY pi.is_featured DESC, pi.sort_order ASC, pi.id ASC LIMIT 1) AS image_url,
            f.created_at AS saved_at
     FROM favorites f JOIN parts p ON p.id = f.part_id JOIN sellers s ON s.id = p.seller_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC, p.id DESC
     LIMIT ${MAX_FAVORITES}`,
    [userId]
  );
  const pro = await isApprovedPro(c.env.DB, userId);
  return ok(c, rows.map((row) => showProPrice(row, pro)));
});

favoritesRoutes.get("/ids", async (c) => {
  const rows = await dbAll<{ part_id: number }>(c.env.DB, "SELECT part_id FROM favorites WHERE user_id = ? LIMIT ?", [c.get("user_id"), MAX_FAVORITES]);
  return ok(c, rows.map((r) => r.part_id));
});

favoritesRoutes.put("/:partId", async (c) => {
  const userId = c.get("user_id");
  const partId = Number(c.req.param("partId"));
  if (!Number.isInteger(partId) || partId <= 0) return fail(c, "Invalid part id");
  const part = await dbFirst<{ id: number }>(
    c.env.DB,
    "SELECT p.id FROM parts p JOIN sellers s ON s.id = p.seller_id WHERE p.id = ? AND p.status = 'active' AND s.status = 'active'",
    [partId]
  );
  if (!part) return fail(c, "Part not found", 404);
  const count = await dbFirst<{ n: number }>(c.env.DB, "SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?", [userId]);
  if (Number(count?.n || 0) >= MAX_FAVORITES) return fail(c, `You can save at most ${MAX_FAVORITES} parts`, 409);
  await dbRun(c.env.DB, "INSERT OR IGNORE INTO favorites (user_id, part_id) VALUES (?, ?)", [userId, partId]);
  return ok(c, { part_id: partId, saved: true });
});

favoritesRoutes.delete("/:partId", async (c) => {
  const partId = Number(c.req.param("partId"));
  await dbRun(c.env.DB, "DELETE FROM favorites WHERE user_id = ? AND part_id = ?", [c.get("user_id"), partId]);
  return ok(c, { part_id: partId, saved: false });
});
