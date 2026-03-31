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
  const make = c.req.query("make")?.trim();

  if (!make) {
    return c.json(
      {
        ok: false,
        data: [],
        error: { message: "make is required" },
      },
      400
    );
  }

  const result = await c.env.DB.prepare(`
    select vm.id, vm.slug, vm.name
    from vehicle_models vm
    inner join vehicle_makes mk on mk.id = vm.make_id
    where lower(mk.slug) = lower(?1)
    order by vm.name asc
  `).bind(make).all();

  return c.json({
    ok: true,
    data: result.results || [],
    error: null,
  });
});

vehiclesRoutes.get("/years", async (c) => {
  const model = c.req.query("model")?.trim();

  if (!model) {
    return c.json(
      {
        ok: false,
        data: [],
        error: { message: "model is required" },
      },
      400
    );
  }

  const result = await c.env.DB.prepare(`
    select vy.id, vy.year
    from vehicle_years vy
    inner join vehicle_models vm on vm.id = vy.model_id
    where lower(vm.slug) = lower(?1)
    order by vy.year desc
  `).bind(model).all();

  return c.json({
    ok: true,
    data: result.results || [],
    error: null,
  });
});
