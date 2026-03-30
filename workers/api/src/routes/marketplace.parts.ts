import { Hono } from "hono";

const router = new Hono();

function ok(data: unknown) {
  return {
    ok: true,
    data,
    error: null
  };
}

router.get("/parts/:id", async (c) => {
  const id = c.req.param("id");

  // 🔹 part
  const part = await c.env.DB.prepare(`
    SELECT 
      p.*,
      b.name as brand_name,
      c.name as category_name,
      s.name as seller_name,
      s.location as seller_location
    FROM parts p
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN sellers s ON s.id = p.seller_id
    WHERE p.id = ?1
    LIMIT 1
  `).bind(id).first();

  if (!part) {
    return c.json({
      ok: false,
      error: { code: "NOT_FOUND", message: "Part not found" }
    }, 404);
  }

  // 🔹 gallery
  const images = await c.env.DB.prepare(`
    SELECT 
      id,
      url,
      alt_text,
      is_featured,
      sort_order
    FROM part_images
    WHERE part_id = ?1
    ORDER BY is_featured DESC, sort_order ASC, id ASC
  `).bind(id).all();

  return c.json(ok({
    ...part,
    gallery: images.results || []
  }));
});

export default router;
