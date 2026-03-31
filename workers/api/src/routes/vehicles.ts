import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { ok } from "../utils/response";

export const vehiclesRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

vehiclesRoutes.get("/makes", async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT DISTINCT make, make_slug
    FROM vehicle_index
    WHERE make IS NOT NULL AND make != ''
    ORDER BY make ASC
  `).all();

  return ok(c, result.results ?? []);
});

vehiclesRoutes.get("/models", async (c) => {
  const make = c.req.query("make")?.trim() ?? "";

  const result = make
    ? await c.env.DB.prepare(`
        SELECT DISTINCT model, model_slug
        FROM vehicle_index
        WHERE make_slug = ?
        ORDER BY model ASC
      `).bind(make).all()
    : await c.env.DB.prepare(`
        SELECT DISTINCT model, model_slug
        FROM vehicle_index
        ORDER BY model ASC
      `).all();

  return ok(c, result.results ?? []);
});

vehiclesRoutes.get("/years", async (c) => {
  const make = c.req.query("make")?.trim() ?? "";
  const model = c.req.query("model")?.trim() ?? "";

  if (make && model) {
    const result = await c.env.DB.prepare(`
      SELECT DISTINCT year
      FROM vehicle_index
      WHERE make_slug = ? AND model_slug = ?
      ORDER BY year DESC
    `).bind(make, model).all();

    return ok(c, result.results ?? []);
  }

  const result = await c.env.DB.prepare(`
    SELECT DISTINCT year
    FROM vehicle_index
    ORDER BY year DESC
  `).all();

  return ok(c, result.results ?? []);
});
