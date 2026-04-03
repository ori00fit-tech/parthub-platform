import { Hono } from "hono";

export const searchRoutes = new Hono();

function ok(data: unknown, meta: unknown = null) {
  return {
    ok: true,
    data,
    meta,
    error: null,
  };
}

function fail(code: string, message: string) {
  return {
    ok: false,
    data: null,
    meta: null,
    error: { code, message },
  };
}

searchRoutes.get("/", async (c) => {
  try {
    const q = c.req.query("q")?.trim() || "";
    const category = c.req.query("category")?.trim() || "";
    const brand = c.req.query("brand")?.trim() || "";
    const make = c.req.query("make")?.trim() || "";
    const model = c.req.query("model")?.trim() || "";
    const condition = c.req.query("condition")?.trim() || "";
    const minPriceRaw = c.req.query("min_price")?.trim() || "";
    const maxPriceRaw = c.req.query("max_price")?.trim() || "";
    const yearRaw = c.req.query("year")?.trim() || "";
    const sort = c.req.query("sort")?.trim() || "relevance";
    const pageRaw = c.req.query("page")?.trim() || "1";
    const limitRaw = c.req.query("limit")?.trim() || "20";

    const year = yearRaw ? Number(yearRaw) : null;
    const minPrice = minPriceRaw ? Number(minPriceRaw) : null;
    const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : null;
    const page = Math.max(1, Number(pageRaw) || 1);
    const limit = Math.min(60, Math.max(1, Number(limitRaw) || 20));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["p.status = 'active'"];
    const bindings: unknown[] = [];

    if (q) {
      bindings.push(`%${q}%`);
      const idx = bindings.length;
      conditions.push(
        `(p.title like ?${idx} or p.description like ?${idx} or p.slug like ?${idx} or p.sku like ?${idx} or b.name like ?${idx} or c.name like ?${idx})`
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

    if (condition) {
      bindings.push(condition);
      conditions.push(`p.condition = ?${bindings.length}`);
    }

    if (minPrice != null && !Number.isNaN(minPrice)) {
      bindings.push(minPrice);
      conditions.push(`p.price >= ?${bindings.length}`);
    }

    if (maxPrice != null && !Number.isNaN(maxPrice)) {
      bindings.push(maxPrice);
      conditions.push(`p.price <= ?${bindings.length}`);
    }

    if (make || model || year) {
      let compatibilitySql = `
        exists (
          select 1
          from part_compatibility pc
          where pc.part_id = p.id
      `;

      if (make) {
        bindings.push(make);
        compatibilitySql += ` and lower(pc.make) = lower(?${bindings.length})`;
      }

      if (model) {
        bindings.push(model);
        compatibilitySql += ` and lower(pc.model) = lower(?${bindings.length})`;
      }

      if (year) {
        bindings.push(year);
        const idx = bindings.length;
        compatibilitySql += ` and pc.year_start <= ?${idx} and (pc.year_end is null or pc.year_end >= ?${idx})`;
      }

      compatibilitySql += ` )`;
      conditions.push(compatibilitySql);
    }

    const whereClause = `where ${conditions.join(" and ")}`;

    const orderClause =
      sort === "newest"
        ? `order by p.created_at desc`
        : sort === "price_asc"
        ? `order by p.price asc, p.created_at desc`
        : sort === "price_desc"
        ? `order by p.price desc, p.created_at desc`
        : q
        ? `order by
            case
              when lower(p.title) like lower(?${bindings.length + 1}) then 1
              when lower(p.sku) like lower(?${bindings.length + 1}) then 2
              when lower(p.description) like lower(?${bindings.length + 1}) then 3
              else 4
            end,
            p.featured desc,
            compatibility_count desc,
            p.created_at desc`
        : `order by p.featured desc, compatibility_count desc, p.created_at desc`;

    const searchBindings = [...bindings];
    if (sort === "relevance" && q) {
      searchBindings.push(`${q}%`);
    }

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
        b.name as brand_name,
        b.slug as brand_slug,
        c.name as category_name,
        c.slug as category_slug,
        s.id as seller_id,
        s.name as seller_name,
        s.slug as seller_slug,
        s.location as seller_location,
        (
          select pi.url
          from part_images pi
          where pi.part_id = p.id
          order by pi.is_featured desc, pi.sort_order asc, pi.id asc
          limit 1
        ) as image_url,
        (
          select count(*)
          from part_compatibility pc
          where pc.part_id = p.id
        ) as compatibility_count
      from parts p
      left join brands b on b.id = p.brand_id
      left join categories c on c.id = p.category_id
      left join sellers s on s.id = p.seller_id
      ${whereClause}
      ${orderClause}
      limit ${limit} offset ${offset};
    `;

    const countSql = `
      select count(*) as total
      from parts p
      left join brands b on b.id = p.brand_id
      left join categories c on c.id = p.category_id
      left join sellers s on s.id = p.seller_id
      ${whereClause};
    `;

    const stmt = c.env.DB.prepare(sql);
    const countStmt = c.env.DB.prepare(countSql);

    const [result, countResult] = await Promise.all([
      searchBindings.length ? stmt.bind(...searchBindings).all() : stmt.all(),
      bindings.length ? countStmt.bind(...bindings).first() : countStmt.first(),
    ]);

    const total = Number((countResult as { total?: number } | null)?.total || 0);

    await c.env.DB.prepare(
      `
      insert into part_search_logs (
        query, make, model, year, category_slug, brand_slug, results_count, session_id
      ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      `
    )
      .bind(
        q || "",
        make || null,
        model || null,
        year || null,
        category || null,
        brand || null,
        Array.isArray(result.results) ? result.results.length : 0,
        c.req.header("x-session-id") || null
      )
      .run();

    return c.json(
      ok(result.results || [], {
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.max(1, Math.ceil(total / limit)),
        },
        query: {
          q,
          category,
          brand,
          make,
          model,
          year,
          condition,
          min_price: minPrice,
          max_price: maxPrice,
          sort,
        },
        currency: "GBP",
        locale: "en-GB",
        market: "United Kingdom",
      })
    );
  } catch (error) {
    return c.json(
      fail(
        "SEARCH_FAILED",
        error instanceof Error ? error.message : "Unknown search error"
      ),
      500
    );
  }
});

searchRoutes.get("/suggestions", async (c) => {
  try {
    const q = c.req.query("q")?.trim() || "";

    if (q.length < 2) {
      return c.json(ok([]));
    }

    const sql = `
      select distinct p.title
      from parts p
      where p.status = 'active'
        and lower(p.title) like lower(?1)
      order by p.title asc
      limit 10;
    `;

    const result = await c.env.DB.prepare(sql).bind(`%${q}%`).all();

    return c.json(ok(result.results || []));
  } catch (error) {
    return c.json(
      fail(
        "SUGGESTIONS_FAILED",
        error instanceof Error ? error.message : "Unknown suggestions error"
      ),
      500
    );
  }
});
