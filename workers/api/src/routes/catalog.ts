import { Hono } from "hono";

export const catalogRoutes = new Hono();

function ok(data: unknown, meta: unknown = null) {
  return {
    ok: true,
    data,
    meta,
    error: null,
  };
}

catalogRoutes.get("/parts", async (c) => {
  const search = c.req.query("search")?.trim() || "";
  const category = c.req.query("category")?.trim() || "";
  const brand = c.req.query("brand")?.trim() || "";

  const conditions: string[] = ["p.status = 'active'"];
  const bindings: unknown[] = [];

  if (search) {
    bindings.push(`%${search}%`);
    const idx = bindings.length;
    conditions.push(
      `(p.title like ?${idx} or p.slug like ?${idx} or p.sku like ?${idx})`
    );
  }

  if (category) {
    bindings.push(category);
    conditions.push(`c.slug = ?${bindings.length}`);
  }

  if (brand) {
    bindings.push(brand);
    conditions.push(`b.slug = ?${bindings.length}`);
  }

  const whereClause = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const sql = `
    select
      p.id,
      p.slug,
      p.title,
      p.description,
      p.sku,
      p.price,
      p.compare_price,
      p.condition,
      p.quantity,
      p.status,
      p.featured,
      p.created_at,
      b.name as brand_name,
      b.slug as brand_slug,
      c.name as category_name,
      c.slug as category_slug,
      s.name as seller_name,
      s.slug as seller_slug,
      s.location as seller_location,
      (
        select pi.url
        from part_images pi
        where pi.part_id = p.id
        order by pi.is_featured desc, pi.sort_order asc, pi.id asc
        limit 1
      ) as image_url
    from parts p
    left join brands b on b.id = p.brand_id
    left join categories c on c.id = p.category_id
    left join sellers s on s.id = p.seller_id
    ${whereClause}
    order by p.featured desc, p.created_at desc
    limit 60;
  `;

  const stmt = c.env.DB.prepare(sql);
  const result = bindings.length ? await stmt.bind(...bindings).all() : await stmt.all();

  return c.json(
    ok(result.results || [], {
      currency: "GBP",
      locale: "en-GB",
      market: "United Kingdom",
      vehicle_filter: null
    })
  );
});

catalogRoutes.get("/parts/:slug", async (c) => {
  const slug = c.req.param("slug");

  const sql = `
    select
      p.id,
      p.slug,
      p.title,
      p.description,
      p.sku,
      p.price,
      p.compare_price,
      p.condition,
      p.quantity,
      p.status,
      p.featured,
      p.created_at,
      p.updated_at,
      p.weight_kg,
      b.name as brand_name,
      b.slug as brand_slug,
      c.name as category_name,
      c.slug as category_slug,
      s.name as seller_name,
      s.slug as seller_slug,
      s.location as seller_location,
      (
        select pi.url
        from part_images pi
        where pi.part_id = p.id
        order by pi.is_featured desc, pi.sort_order asc, pi.id asc
        limit 1
      ) as image_url
    from parts p
    left join brands b on b.id = p.brand_id
    left join categories c on c.id = p.category_id
    left join sellers s on s.id = p.seller_id
    where p.slug = ?1
    limit 1;
  `;

  const result = await c.env.DB.prepare(sql).bind(slug).first();

  if (!result) {
    return c.json(
      {
        ok: false,
        data: null,
        meta: null,
        error: {
          code: "NOT_FOUND",
          message: "Part not found",
        },
      },
      404
    );
  }

  return c.json(
    ok(result, {
      currency: "GBP",
      locale: "en-GB",
      market: "United Kingdom",
    })
  );
});

catalogRoutes.get("/categories", async (c) => {
  const sql = `
    select id, name, slug
    from categories
    order by name asc;
  `;
  const result = await c.env.DB.prepare(sql).all();

  return c.json(
    ok(result.results || [], {
      market: "United Kingdom",
    })
  );
});

catalogRoutes.get("/brands", async (c) => {
  const sql = `
    select id, name, slug
    from brands
    order by name asc;
  `;
  const result = await c.env.DB.prepare(sql).all();

  return c.json(
    ok(result.results || [], {
      market: "United Kingdom",
    })
  );
});
