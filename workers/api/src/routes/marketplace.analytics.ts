import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";

export const marketplaceAnalyticsRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

function ok(data: unknown, meta: unknown = null) {
  return { ok: true, data, meta, error: null };
}

function fail(code: string, message: string) {
  return { ok: false, data: null, meta: null, error: { code, message } };
}

marketplaceAnalyticsRoutes.get("/me/insights", authMiddleware, async (c) => {
  const sellerId = c.get("seller_id");

  if (!sellerId) {
    return c.json(fail("NOT_SELLER", "Seller account required"), 403);
  }

  const [sellerStats, topDemand, missedDemand, vehicleDemand, sellerInventory] = await Promise.all([
    c.env.DB.prepare(`
      select
        (select count(*) from parts where seller_id = ?1) as total_parts,
        (select count(*) from parts where seller_id = ?1 and status = 'active') as active_parts,
        (select count(*) from parts where seller_id = ?1 and status = 'pending') as pending_parts,
        (
          select count(*)
          from order_items oi
          join parts p on p.id = oi.part_id
          where p.seller_id = ?1
        ) as order_items_count
    `).bind(sellerId).first(),

    c.env.DB.prepare(`
      select
        query,
        count(*) as searches,
        avg(results_count) as avg_results
      from part_search_logs
      where query is not null
        and trim(query) != ''
      group by query
      order by searches desc
      limit 10
    `).all(),

    c.env.DB.prepare(`
      select
        query,
        make_slug,
        model_slug,
        year,
        count(*) as searches
      from part_search_logs
      where coalesce(results_count, 0) = 0
      group by query, make_slug, model_slug, year
      order by searches desc
      limit 10
    `).all(),

    c.env.DB.prepare(`
      select
        make_slug,
        model_slug,
        year,
        count(*) as searches
      from part_search_logs
      where make_slug is not null
        and model_slug is not null
      group by make_slug, model_slug, year
      order by searches desc
      limit 10
    `).all(),

    c.env.DB.prepare(`
      select
        p.id,
        p.title,
        p.slug,
        p.status,
        p.quantity,
        p.price,
        (
          select count(*)
          from part_compatibility pc
          where pc.part_id = p.id
        ) as compatibility_count
      from parts p
      where p.seller_id = ?1
      order by p.created_at desc
      limit 12
    `).bind(sellerId).all(),
  ]);

  return c.json(
    ok({
      seller_stats: sellerStats || {},
      top_demand: topDemand.results || [],
      missed_demand: missedDemand.results || [],
      top_vehicle_demand: vehicleDemand.results || [],
      inventory_snapshot: sellerInventory.results || [],
    })
  );
});
