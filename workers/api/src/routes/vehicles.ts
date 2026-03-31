import { Hono } from "hono";

const router = new Hono();

/**
 * GET /vehicles/makes
 */
router.get("/makes", async (c) => {
  try {
    const db = c.env.DB;

    const result = await db
      .prepare("SELECT id, slug, name, logo_url FROM vehicle_makes ORDER BY name ASC")
      .all();

    return c.json({
      ok: true,
      data: result.results || [],
      error: null,
    });
  } catch (err) {
    return c.json(
      {
        ok: false,
        data: null,
        error: {
          message: err.message || "Failed to fetch makes",
        },
      },
      500
    );
  }
});

/**
 * GET /vehicles/models?make=audi
 */
router.get("/models", async (c) => {
  try {
    const db = c.env.DB;

    const url = new URL(c.req.url);
    const make = url.searchParams.get("make");

    if (!make) {
      return c.json({ ok: true, data: [] });
    }

    const result = await db
      .prepare(
        `
        SELECT vm.id, vm.slug, vm.name
        FROM vehicle_models vm
        JOIN vehicle_makes mk ON mk.id = vm.make_id
        WHERE mk.slug = ?
        ORDER BY vm.name ASC
      `
      )
      .bind(make)
      .all();

    return c.json({
      ok: true,
      data: result.results || [],
      error: null,
    });
  } catch (err) {
    return c.json(
      {
        ok: false,
        data: null,
        error: {
          message: err.message || "Failed to fetch models",
        },
      },
      500
    );
  }
});

/**
 * GET /vehicles/years?model=a3
 */
router.get("/years", async (c) => {
  try {
    const db = c.env.DB;

    const url = new URL(c.req.url);
    const model = url.searchParams.get("model");

    if (!model) {
      return c.json({ ok: true, data: [] });
    }

    const result = await db
      .prepare(
        `
        SELECT vy.id, vy.year
        FROM vehicle_years vy
        JOIN vehicle_models vm ON vm.id = vy.model_id
        WHERE vm.slug = ?
        ORDER BY vy.year DESC
      `
      )
      .bind(model)
      .all();

    return c.json({
      ok: true,
      data: result.results || [],
      error: null,
    });
  } catch (err) {
    return c.json(
      {
        ok: false,
        data: null,
        error: {
          message: err.message || "Failed to fetch years",
        },
      },
      500
    );
  }
});

export default router;
