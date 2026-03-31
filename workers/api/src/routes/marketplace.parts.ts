import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { fail, ok } from "../utils/response";

export const marketplacePartsRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

marketplacePartsRoutes.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const part = await c.env.DB.prepare(`
    SELECT
      p.*,
      s.store_name,
      s.slug AS seller_slug
    FROM parts p
    LEFT JOIN sellers s ON s.id = p.seller_id
    WHERE p.slug = ?
    LIMIT 1
  `).bind(slug).first();

  if (!part) return fail(c, "Part not found", 404);

  const images = await c.env.DB.prepare(`
    SELECT id, file_url, alt_text, sort_order
    FROM part_media
    WHERE part_id = ?
    ORDER BY sort_order ASC, id ASC
  `).bind((part as { id: number }).id).all();

  return ok(c, {
    ...(part as Record<string, unknown>),
    images: images.results ?? [],
  });
});
