import { Hono } from "hono";

export const vehiclesRoutes = new Hono();

vehiclesRoutes.get("/makes", async (c) => {
  const result = await c.env.DB.prepare(`
    select id, slug, name, logo_url
    from vehicle_makes
    order by name asc
  `).all();

  return c.json({
    ok: true,
    data: result.results || [],
    error: null,
  });
});

vehiclesRoutes.get("/models", async (c) => {
  const make = c.req.query("make");

  if (!make) {
    return c.json({ ok: false, error: "make is required" }, 400);
  }

  const result = await c.env.DB.prepare(`
    select id, slug, name
    from vehicle_models
    where make_slug = ?1
    order by name asc
  `).bind(make).all();

  return c.json({
    ok: true,
    data: result.results || [],
    error: null,
  });
});

vehiclesRoutes.get("/years", async (c) => {
  const model = c.req.query("model");

  if (!model) {
    return c.json({ ok: false, error: "model is required" }, 400);
  }

  const result = await c.env.DB.prepare(`
    select id, year
    from vehicle_years
    where model_slug = ?1
    order by year desc
  `).bind(model).all();

  return c.json({
    ok: true,
    data: result.results || [],
    error: null,
  });
});
