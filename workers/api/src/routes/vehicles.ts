import { Hono } from "hono";

export const vehiclesRoutes = new Hono();

function success(data: unknown, meta: unknown = null) {
  return {
    ok: true,
    data,
    meta,
    error: null,
  };
}

function failure(code: string, message: string) {
  return {
    ok: false,
    data: null,
    meta: null,
    error: { code, message },
  };
}

vehiclesRoutes.get("/makes", async (c) => {
  try {
    const result = await c.env.DB.prepare(`
      select id, slug, name, logo_url
      from vehicle_makes
      order by name asc
    `).all();

    return c.json(success(result.results || []));
  } catch (error) {
    return c.json(
      failure(
        "GET_MAKES_FAILED",
        error instanceof Error ? error.message : "Unknown makes error"
      ),
      500
    );
  }
});

vehiclesRoutes.get("/models", async (c) => {
  try {
    const make = (c.req.query("make") || "").trim();

    if (!make) {
      return c.json(failure("MAKE_REQUIRED", "make query is required"), 400);
    }

    const result = await c.env.DB.prepare(`
      select vm.id, vm.slug, vm.name
      from vehicle_models vm
      inner join vehicle_makes mk on mk.id = vm.make_id
      where mk.slug = ?1
      order by vm.name asc
    `)
      .bind(make)
      .all();

    return c.json(success(result.results || [], { make }));
  } catch (error) {
    return c.json(
      failure(
        "GET_MODELS_FAILED",
        error instanceof Error ? error.message : "Unknown models error"
      ),
      500
    );
  }
});

vehiclesRoutes.get("/years", async (c) => {
  try {
    const model = (c.req.query("model") || "").trim();

    if (!model) {
      return c.json(failure("MODEL_REQUIRED", "model query is required"), 400);
    }

    const result = await c.env.DB.prepare(`
      select vy.id, vy.year
      from vehicle_years vy
      inner join vehicle_models vm on vm.id = vy.model_id
      where vm.slug = ?1
      order by vy.year desc
    `)
      .bind(model)
      .all();

    return c.json(success(result.results || [], { model }));
  } catch (error) {
    return c.json(
      failure(
        "GET_YEARS_FAILED",
        error instanceof Error ? error.message : "Unknown years error"
      ),
      500
    );
  }
});
