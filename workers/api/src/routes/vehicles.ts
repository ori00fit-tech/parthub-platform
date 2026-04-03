import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";

export const vehiclesRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

vehiclesRoutes.get("/makes", async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT id, slug, name
    FROM vehicle_makes
    ORDER BY name ASC
  `).all();

  return c.json({
    ok: true,
    data: result.results || [],
    meta: null,
    error: null,
  });
});

vehiclesRoutes.get("/models", async (c) => {
  const make = c.req.query("make")?.trim() || "";

  if (!make) {
    return c.json({
      ok: false,
      data: null,
      meta: null,
      error: {
        code: "MAKE_REQUIRED",
        message: "make is required",
      },
    }, 400);
  }

  const result = await c.env.DB.prepare(`
    SELECT vm.id, vm.slug, vm.name
    FROM vehicle_models vm
    JOIN vehicle_makes mk ON mk.id = vm.make_id
    WHERE lower(mk.slug) = lower(?1)
    ORDER BY vm.name ASC
  `).bind(make).all();

  return c.json({
    ok: true,
    data: result.results || [],
    meta: null,
    error: null,
  });
});

vehiclesRoutes.get("/years", async (c) => {
  const model = c.req.query("model")?.trim() || "";

  if (!model) {
    return c.json({
      ok: false,
      data: null,
      meta: null,
      error: {
        code: "MODEL_REQUIRED",
        message: "model is required",
      },
    }, 400);
  }

  const result = await c.env.DB.prepare(`
    SELECT vy.id, vy.year
    FROM vehicle_years vy
    JOIN vehicle_models vm ON vm.id = vy.model_id
    WHERE lower(vm.slug) = lower(?1)
    ORDER BY vy.year DESC
  `).bind(model).all();

  return c.json({
    ok: true,
    data: result.results || [],
    meta: null,
    error: null,
  });
});
