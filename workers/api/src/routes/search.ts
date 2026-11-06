import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { normalizeNumber } from "../utils/part-numbers";

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
    // fit=only (default): only parts with compatibility for the vehicle.
    // fit=rank: every part, best fit first (exact year, then same model).
    const fitOnly = c.req.query("fit")?.trim() !== "rank";

    const year = yearRaw ? Number(yearRaw) : null;
    const minPrice = minPriceRaw ? Number(minPriceRaw) : null;
    const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : null;
    const page = Math.max(1, Number(pageRaw) || 1);
    const limit = 20;
    const offset = (page - 1) * limit;

    // Public listings: active parts of approved (active) stores only.
    const where: string[] = ["p.status = 'active'", "s.status = 'active'"];
    const params: unknown[] = [];

    // A query that looks like a part number ("7701 208-174") also finds the
    // listings carrying that number, or a number linked to it by a verified
    // link, whatever the spaces / dashes / dots.
    const qNorm = normalizeNumber(q);
    let numberMatchSql = "0";
    if (q) {
      const like = `%${q}%`;
      const n = params.length;
      const numberCond = qNorm.length >= 4
        ? `
        or exists (
          select 1 from part_listing_numbers pln
          where pln.part_id = p.id and pln.part_number_id in (
            select pn.id from part_numbers pn where pn.number_norm = ?${n + 7}
            union select l.to_id from part_number_links l join part_numbers pn on pn.id = l.from_id
              where pn.number_norm = ?${n + 7} and l.verification in ('admin_approved','verified')
            union select l.from_id from part_number_links l join part_numbers pn on pn.id = l.to_id
              where pn.number_norm = ?${n + 7} and l.verification in ('admin_approved','verified')
          )
        )
        or replace(replace(replace(replace(upper(coalesce(p.sku, '')), ' ', ''), '-', ''), '.', ''), '/', '') = ?${n + 7}`
        : "";
      where.push(`(
        p.title like ?${n + 1}
        or p.slug like ?${n + 2}
        or p.sku like ?${n + 3}
        or p.description like ?${n + 4}
        or b.name like ?${n + 5}
        or c.name like ?${n + 6}
        ${numberCond}
      )`);
      params.push(like, like, like, like, like, like);
      if (qNorm.length >= 4) {
        params.push(qNorm);
        numberMatchSql = `(case when exists (
          select 1 from part_listing_numbers pln join part_numbers pn on pn.id = pln.part_number_id
          where pln.part_id = p.id and pn.number_norm = ?${n + 7}
        ) or replace(replace(replace(replace(upper(coalesce(p.sku, '')), ' ', ''), '-', ''), '.', ''), '/', '') = ?${n + 7}
        then 1 else 0 end)`;
      }
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
    let engineCheckMatchSql = "0";
    let partialVehicleMatchSql = "0";
    let compatibilityWhereSql = "";
    // Params pushed from here on belong to the vehicle match expressions
    // (select list) and, with fit=only, the vehicle filter.
    const vehicleParamsStart = params.length;

    // Engine of the buyer's car (optional): catalog id and/or name.
    const engineIdRaw = Number(c.req.query("engine_id"));
    const engineId = Number.isInteger(engineIdRaw) && engineIdRaw > 0 ? engineIdRaw : null;
    const engineName = c.req.query("engine")?.trim() || "";

    if (make && model && year != null && !Number.isNaN(year)) {
      const start = params.length;
      const M = start + 1, MO = start + 2, Y = start + 3, EI = start + 4, EN = start + 5;
      const vehicleRow = `
        pc.part_id = p.id
        and lower(pc.make) = lower(?${M})
        and lower(pc.model) = lower(?${MO})
        and pc.year_start <= ?${Y}
        and (pc.year_end is null or pc.year_end >= ?${Y})`;
      const engineKnown = `(?${EI} is not null or ?${EN} <> '')`;
      const sameEngine = `(pc.engine_id = ?${EI} or (?${EN} <> '' and lower(coalesce(pc.engine, '')) = lower(?${EN})))`;

      // Fits for sure: the seller confirmed every engine, or named the
      // buyer's engine. A row without an engine is NOT "every engine".
      exactVehicleMatchSql = `
        case when exists (
          select 1 from part_compatibility pc
          where ${vehicleRow}
            and (pc.engine_scope = 'all' or (pc.engine_scope = 'specific' and ${engineKnown} and ${sameEngine}))
        ) then 1 else 0 end
      `;

      // Same model and year, but the engine must be checked: the row does
      // not say which engine, or the buyer did not say theirs.
      engineCheckMatchSql = `
        case when exists (
          select 1 from part_compatibility pc
          where ${vehicleRow}
            and (pc.engine_scope = 'unspecified' or (pc.engine_scope = 'specific' and not ${engineKnown}))
        ) then 1 else 0 end
      `;

      partialVehicleMatchSql = `
        case when exists (
          select 1 from part_compatibility pc
          where pc.part_id = p.id
            and lower(pc.make) = lower(?${M})
            and lower(pc.model) = lower(?${MO})
        ) then 1 else 0 end
      `;

      // fit=only: model and year match, and not only for another engine.
      compatibilityWhereSql = !fitOnly ? "" : `
        and exists (
          select 1 from part_compatibility pc
          where ${vehicleRow}
            and not (pc.engine_scope = 'specific' and ${engineKnown} and not ${sameEngine})
        )
      `;

      params.push(make, model, year, engineId, engineName);
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

      compatibilityWhereSql = !fitOnly ? "" : `
        and exists (
          select 1
          from part_compatibility pc
          where pc.part_id = p.id
            and lower(pc.make) = lower(?${start + 3})
            and lower(pc.model) = lower(?${start + 4})
        )
      `;

      params.push(make, model);
      if (fitOnly) params.push(make, model);
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

      compatibilityWhereSql = !fitOnly ? "" : `
        and exists (
          select 1
          from part_compatibility pc
          where pc.part_id = p.id
            and lower(pc.make) = lower(?${start + 2})
        )
      `;

      params.push(make);
      if (fitOnly) params.push(make);
    }

    const whereClause = where.length ? `where ${where.join(" and ")}` : "";

    const rankingScoreSql = `
      (
        (${numberMatchSql}) * 300 +
        (${exactVehicleMatchSql}) * 120 +
        (${engineCheckMatchSql}) * 90 +
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
        ${numberMatchSql} as number_match,
        ${exactVehicleMatchSql} as exact_vehicle_match,
        ${engineCheckMatchSql} as engine_check_match,
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

    // The count query has no select-list match expressions: with fit=rank it
    // only references the filters pushed before the vehicle section.
    const countParams = fitOnly ? [...params] : params.slice(0, vehicleParamsStart);
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
        make,
        model,
        year,
        category_slug,
        brand_slug,
        results_count
      ) values (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      `
    )
      .bind(q, make || null, model || null, year || null, category || null, brand || null, total)
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
          fit: fitOnly ? "only" : "rank",
        },
        currency: "MAD",
        locale: "fr-MA",
        market: "Morocco",
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
        and exists (select 1 from sellers st where st.id = p.seller_id and st.status = 'active')
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
