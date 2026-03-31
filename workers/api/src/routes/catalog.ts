import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { ok, fail } from "../utils/response";

export const catalogRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

catalogRoutes.get("/parts", async (c) => {
  const search = c.req.query("search")?.trim() ?? "";
  const category = c.req.query("category")?.trim() ?? "";
  const make = c.req.query("make")?.trim() ?? "";
  const model = c.req.query("model")?.trim() ?? "";
  const year = c.req.query("year")?.trim() ?? "";

  const where: string[] = ["p.is_active = 1"];
  const bindings: unknown[] = [];

  if (search) {
    where.push("(p.title LIKE ? OR p.sku LIKE ? OR p.brand LIKE ?)");
    bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (category) {
    where.push("p.category_slug = ?");
    bindings.push(category);
  }

  if (make) {
    where.push("EXISTS (SELECT 1 FROM part_compatibility pc WHERE pc.part_id = p.id AND pc.make_slug = ?)");
    bindings.push(make);
  }

  if (model) {
    where.push("EXISTS (SELECT 1 FROM part_compatibility pc WHERE pc.part_id = p.id AND pc.model_slug = ?)");
    bindings.push(model);
  }

  if (year) {
    where.push("EXISTS (SELECT 1 FROM part_compatibility pc WHERE pc.part_id = p.id AND ? BETWEEN pc.year_from AND pc.year_to)");
    bindings.push(Number(year));
  }

  const sql = `
    SELECT
      p.id,
      p.slug,
      p.title,
      p.sku,
      p.brand,
      p.price,
      p.sale_price,
      p.currency,
      p.stock_qty,
      p.condition,
      p.category_slug,
      (
        SELECT pm.file_url
        FROM part_media pm
        WHERE pm.part_id = p.id
        ORDER BY pm.sort_order ASC, pm.id ASC
        LIMIT 1
      ) AS image_url
    FROM parts p
    WHERE ${where.join(" AND ")}
    ORDER BY p.id DESC
    LIMIT 60
  `;

  const stmt = c.env.DB.prepare(sql).bind(...bindings);
  const result = await stmt.all();

  return ok(c, {
    items: result.results ?? [],
    total: (result.results ?? []).length,
  });
});

catalogRoutes.get("/parts/:slug", async (c) => {
  const slug = c.req.param("slug");

  const sql = `
    SELECT
      p.*,
      s.store_name,
      s.slug AS seller_slug
    FROM parts p
    LEFT JOIN sellers s ON s.id = p.seller_id
    WHERE p.slug = ?
    LIMIT 1
  `;

  const result = await c.env.DB.prepare(sql).bind(slug).first();
  if (!result) return fail(c, "Part not found", 404);

  const media = await c.env.DB.prepare(
    `
      SELECT id, file_url, alt_text, sort_order
      FROM part_media
      WHERE part_id = ?
      ORDER BY sort_order ASC, id ASC
    `
  ).bind((result as { id: number }).id).all();

  return ok(c, {
    ...(result as Record<string, unknown>),
    media: media.results ?? [],
  });
});

catalogRoutes.get("/categories", async (c) => {
  const result = await c.env.DB.prepare(
    `
      SELECT id, name, slug, icon, parent_id
      FROM categories
      ORDER BY name ASC
    `
  ).all();

  return ok(c, result.results ?? []);
});

catalogRoutes.get("/brands", async (c) => {
  const result = await c.env.DB.prepare(
    `
      SELECT DISTINCT brand
      FROM parts
      WHERE brand IS NOT NULL AND brand != ''
      ORDER BY brand ASC
    `
  ).all();

  return ok(c, result.results ?? []);
});
