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

// GET /api/v1/vehicles/generations?make=renault&model=clio
// Generations of a model, oldest first: [{ id, slug, name, year_start, year_end }].
vehiclesRoutes.get("/generations", async (c) => {
  const make = c.req.query("make")?.trim() || "";
  const model = c.req.query("model")?.trim() || "";
  if (!make || !model) {
    return c.json({ ok: false, data: null, meta: null, error: { code: "MODEL_REQUIRED", message: "make and model are required" } }, 400);
  }
  const result = await c.env.DB.prepare(`
    SELECT g.id, g.slug, g.name, g.year_start, g.year_end
    FROM vehicle_generations g
    JOIN vehicle_models vm ON vm.id = g.model_id
    JOIN vehicle_makes mk ON mk.id = vm.make_id
    WHERE lower(mk.slug) = lower(?1) AND (lower(vm.slug) = lower(?2) OR lower(vm.name) = lower(?2))
    ORDER BY g.year_start ASC, g.sort_order ASC
  `).bind(make, model).all();
  return c.json({ ok: true, data: result.results || [], meta: null, error: null });
});

// GET /api/v1/vehicles/engines?generation_id=12
// Engines of a generation: [{ id, name, fuel, displacement_cc, power_hp }].
vehiclesRoutes.get("/engines", async (c) => {
  const generationId = Number(c.req.query("generation_id"));
  if (!Number.isInteger(generationId) || generationId <= 0) {
    return c.json({ ok: false, data: null, meta: null, error: { code: "GENERATION_REQUIRED", message: "generation_id is required" } }, 400);
  }
  const result = await c.env.DB.prepare(`
    SELECT id, slug, name, fuel, displacement_cc, power_hp
    FROM vehicle_engines
    WHERE generation_id = ?1
    ORDER BY CASE fuel WHEN 'petrol' THEN 0 WHEN 'diesel' THEN 1 WHEN 'hybrid' THEN 2 ELSE 3 END, displacement_cc, power_hp, name
  `).bind(generationId).all();
  return c.json({ ok: true, data: result.results || [], meta: null, error: null });
});
