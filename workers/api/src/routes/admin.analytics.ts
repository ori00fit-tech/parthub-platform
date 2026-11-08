import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { adminGuard } from "../middlewares/admin";

export const adminAnalyticsRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// Admins only. (Mounted under /api/v1/admin, whose guard also covers it,
// but this keeps it protected wherever it is mounted.)
adminAnalyticsRoutes.use("*", authMiddleware, adminGuard);

function ok(data: unknown, meta: unknown = null) {
  return {
    ok: true,
    data,
    meta,
    error: null,
  };
}

adminAnalyticsRoutes.get("/search-demand", async (c) => {
  const [topQueries, zeroResultQueries, topVehicles, recentSearches] = await Promise.all([
    c.env.DB.prepare(`
      select
        query,
        count(*) as searches,
        avg(results_count) as avg_results
      from part_search_logs
      where query is not null
        and trim(query) != ''
      group by query
      order by searches desc, query asc
      limit 12
    `).all(),

    c.env.DB.prepare(`
      select
        query,
        make as make_slug,
        model as model_slug,
        year,
        count(*) as searches
      from part_search_logs
      where coalesce(results_count, 0) = 0
      group by query, make, model, year
      order by searches desc
      limit 12
    `).all(),

    c.env.DB.prepare(`
      select
        make as make_slug,
        model as model_slug,
        year,
        count(*) as searches
      from part_search_logs
      where make is not null
        and model is not null
      group by make, model, year
      order by searches desc
      limit 12
    `).all(),

    c.env.DB.prepare(`
      select
        query,
        make as make_slug,
        model as model_slug,
        year,
        results_count,
        created_at
      from part_search_logs
      order by id desc
      limit 20
    `).all(),
  ]);

  return c.json(
    ok({
      top_queries: topQueries.results || [],
      zero_result_queries: zeroResultQueries.results || [],
      top_vehicle_searches: topVehicles.results || [],
      recent_searches: recentSearches.results || [],
    })
  );
});
