import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";

export const searchRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

function ok(data: unknown, meta: unknown = null) {
  return {
    ok: true,
    data,
    meta,
    error: null,
  };
}

function fail(message: string, code = "SEARCH_FAILED") {
  return {
    ok: false,
    data: null,
    meta: null,
    error: {
      code,
      message,
    },
  };
}

searchRoutes.get("/", async (c) => {
  try {
    const q = c.req.query("q")?.trim() || "";
    const category = c.req.query("category")?.trim() || "";
    const brand = c.req.query("brand")?.trim() || "";
    const make = c.req.query("make")?.trim() || "";
    const model = c.req.query("model")?.trim() || "";
    const yearRaw = c.req.query("year")?.trim() || "";
    const condition = c.req.query("condition")?.trim() || "";
    const minPriceRaw = c.req.query("min_price")?.trim() || "";
    const maxPriceRaw = c.req.query("max_price")?.trim() || "";
    const sort = c.req.query("sort")?.trim() || "relevance";
    const pageRaw = c.req.query("page")?.trim() || "1";

    const year = yearRaw ? Number(yearRaw) : null;
    const minPrice = minPriceRaw ? Number(minPriceRaw) : null;
    const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : null;
    const page = Math.max(1, Number(pageRaw) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    const where: string[] = ["p.status = 'active'"];
    const params: unknown[] = [];

    if (q) {
      const like = `%${q}%`;
      where.push(`(
        p.title like ?${params.length + 1}
        or p.slug like ?${params.length + 2}
        or p.sku like ?${params.length + 3}
        or p.description like ?${params.length + 4}
        or b.name like ?${params.length + 5}
        or c.name like ?${params.length + 6}
      )`);
      params.push(like, like, like, like, like, like);
    }

    if (category) {
      where.push(`c.slug = ?${params.length + 1}`);
      params.push(category);
    }

    if (brand) {
      where.push(`b.slug = ?${params.length + 1}`);
      params.push(brand);
    }

    if (condition) {
      where.push(`p.condition = ?${params.length + 1}`);
      params.push(condition);
    }

    if (minPrice != null && !Number.isNaN(minPrice)) {
      where.push(`p.price >= ?${params.length + 1}`);
      params.push(minPrice);
    }

    if (maxPrice != null && !Number.isNaN(maxPrice)) {
      where.push(`p.price <= ?${params.length + 1}`);
      params.push(maxPrice);
    }

    let exactVehicleMatchSql = "0";
    let partialVehicleMatchSql = "0";
    let compatibilityWhereSql = "";

    if (make && model && year != null && !Number.isNaN(year)) {
      const start = params.length;

      exactVehicleMatchSql = `
        case
          when exists (
            select 1
            from part_compatibility pc
            where pc.part_id = p.id
              and lower(pc.make) = lower(?${start + 1})
              and lower(pc.model) = lower(?${start + 2})
              and pc.year_start <= ?${start + 3}
              and (pc.year_end is null or pc.year_end >= ?${start + 4})
          ) then 1
          else 0
        end
      `;

      partialVehicleMatchSql = `
        case
          when exists (
            select 1
            from part_compatibility pc
            where pc.part_id = p.id
              and lower(pc.make) = lower(?${start + 5})
              and lower(pc.model) = lower(?${start + 6})
          ) then 1
          else 0
        end
      `;

      compatibilityWhereSql = `
        and exists (
          select 1
          from part_compatibility pc
          where pc.part_id = p.id
            and lower(pc.make) = lower(?${start + 7})
            and lower(pc.model) = lower(?${start + 8})
            and pc.year_start <= ?${start + 9}
            and (pc.year_end is null or pc.year_end >= ?${start + 10})
        )
      `;

      params.push(
        make, model, year, year,
        make, model,
        make, model, year, year
      );
    } else if (make && model) {
      const start = params.length;

      exactVehicleMatchSql = `
        case
          when exists (
            select 1
            from part_compatibility pc
            where pc.part_id = p.id
              and lower(pc.make) = lower(?${start + 1})
              and lower(pc.model) = lower(?${start + 2})
          ) then 1
          else 0
        end
      `;

      partialVehicleMatchSql = exactVehicleMatchSql;

      compatibilityWhereSql = `
        and exists (
          select 1
          from part_compatibility pc
          where pc.part_id = p.id
            and lower(pc.make) = lower(?${start + 3})
            and lower(pc.model) = lower(?${start + 4})
        )
      `;

      params.push(make, model, make, model);
    } else if (make) {
      const start = params.length;

      partialVehicleMatchSql = `
        case
          when exists (
            select 1
            from part_compatibility pc
            where pc.part_id = p.id
              and lower(pc.make) = lower(?${start + 1})
          ) then 1
          else 0
        end
      `;

      compatibilityWhereSql = `
        and exists (
          select 1
          from part_compatibility pc
          where pc.part_id = p.id
            and lower(pc.make) = lower(?${start + 2})
        )
      `;

      params.push(make, make);
    }

    const whereClause = where.length ? `where ${where.join(" and ")}` : "";

    const rankingScoreSql = `
      (
        (${exactVehicleMatchSql}) * 120 +
        (${partialVehicleMatchSql}) * 45 +
        (case when p.quantity > 0 then 30 else 0 end) +
        (case when p.featured = 1 then 20 else 0 end) +
        (case
          when (
            select count(*)
            from part_compatibility pc
            where pc.part_id = p.id
          ) >= 1 then 12
          else 0
        end) +
        (case
          when (
            select count(*)
            from part_compatibility pc
            where pc.part_id = p.id
          ) >= 3 then 10
          else 0
        end)
      )
    `;

    const orderBy =
      sort === "price_asc"
        ? `order by p.price asc, ranking_score desc, p.created_at desc`
        : sort === "price_desc"
          ? `order by p.price desc, ranking_score desc, p.created_at desc`
          : sort === "newest"
            ? `order by p.created_at desc, ranking_score desc`
            : `
              order by
                ranking_score desc,
                p.created_at desc
            `;

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
        p.part_origin,
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
        s.seller_type,
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
        ) as compatibility_count,
        ${exactVehicleMatchSql} as exact_vehicle_match,
        ${partialVehicleMatchSql} as partial_vehicle_match,
        case when p.quantity > 0 then 1 else 0 end as in_stock_score,
        ${rankingScoreSql} as ranking_score
      from parts p
      left join brands b on b.id = p.brand_id
      left join categories c on c.id = p.category_id
      left join sellers s on s.id = p.seller_id
      ${whereClause}
      ${compatibilityWhereSql}
      ${orderBy}
      limit ?${params.length + 1}
      offset ?${params.length + 2}
    `;

    const result = await c.env.DB.prepare(sql).bind(...params, limit, offset).all();

    const countParams = [...params];
    const countSql = `
      select count(*) as total
      from parts p
      left join brands b on b.id = p.brand_id
      left join categories c on c.id = p.category_id
      left join sellers s on s.id = p.seller_id
      ${whereClause}
      ${compatibilityWhereSql}
    `;

    const countResult = await c.env.DB.prepare(countSql).bind(...countParams).first<{ total: number }>();
    const total = Number(countResult?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    await c.env.DB.prepare(
      `
      insert into part_search_logs (
        query,
        make_slug,
        model_slug,
        year,
        results_count
      ) values (?1, ?2, ?3, ?4, ?5)
      `
    )
      .bind(q || null, make || null, model || null, year || null, total)
      .run()
      .catch(() => null);

    return c.json(
      ok(result.results || [], {
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
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
      fail(error instanceof Error ? error.message : "Unknown search error"),
      500
    );
  }
});

searchRoutes.get("/suggestions", async (c) => {
  try {
    const q = c.req.query("q")?.trim() || "";

    if (!q || q.length < 2) {
      return c.json(ok([], null));
    }

    const like = `%${q}%`;

    const sql = `
      select
        p.title
      from parts p
      where p.status = 'active'
        and (
          p.title like ?1
          or p.sku like ?1
          or p.slug like ?1
        )
      group by p.title
      order by p.featured desc, p.created_at desc
      limit 8
    `;

    const result = await c.env.DB.prepare(sql).bind(like).all();

    return c.json(ok((result.results || []).map((item: any) => item.title).filter(Boolean)));
  } catch (error) {
    return c.json(
      fail(error instanceof Error ? error.message : "Unknown suggestions error"),
      500
    );
  }
});
