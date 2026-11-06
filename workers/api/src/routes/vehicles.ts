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

  // Several makes share model slugs (Opel/Vauxhall Astra, SEAT/Cupra Leon):
  // with ?make= the years are those of that make's model only.
  const make = c.req.query("make")?.trim() || "";
  const result = await c.env.DB.prepare(`
    SELECT vy.id, vy.year
    FROM vehicle_years vy
    JOIN vehicle_models vm ON vm.id = vy.model_id
    JOIN vehicle_makes mk ON mk.id = vm.make_id
    WHERE lower(vm.slug) = lower(?1) AND (?2 = '' OR lower(mk.slug) = lower(?2))
    GROUP BY vy.year
    ORDER BY vy.year DESC
  `).bind(model, make).all();

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

// GET /api/v1/vehicles/engines-for?make=renault&model=clio&year=2015
// Engines a buyer can pick for their car: those of every generation sold that
// year ("Clio III · 1.5 dCi 85", "Clio IV · 1.5 dCi 90"...).
vehiclesRoutes.get("/engines-for", async (c) => {
  const make = c.req.query("make")?.trim() || "";
  const model = c.req.query("model")?.trim() || "";
  const year = Number(c.req.query("year"));
  if (!make || !model || !Number.isInteger(year)) {
    return c.json({ ok: false, data: null, meta: null, error: { code: "VEHICLE_REQUIRED", message: "make, model and year are required" } }, 400);
  }
  const result = await c.env.DB.prepare(`
    SELECT e.id, e.name, e.fuel, g.id AS generation_id, g.name AS generation
    FROM vehicle_engines e
    JOIN vehicle_generations g ON g.id = e.generation_id
    JOIN vehicle_models vm ON vm.id = g.model_id
    JOIN vehicle_makes mk ON mk.id = vm.make_id
    WHERE lower(mk.slug) = lower(?1) AND (lower(vm.slug) = lower(?2) OR lower(vm.name) = lower(?2))
      AND g.year_start <= ?3 AND (g.year_end IS NULL OR g.year_end >= ?3)
    ORDER BY g.year_start, CASE e.fuel WHEN 'petrol' THEN 0 WHEN 'diesel' THEN 1 WHEN 'hybrid' THEN 2 ELSE 3 END, e.displacement_cc, e.power_hp
  `).bind(make, model, year).all();
  return c.json({ ok: true, data: result.results || [], meta: null, error: null });
});
