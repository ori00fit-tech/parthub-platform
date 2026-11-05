import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { authMiddleware } from "../middlewares/auth";
import { ok, created, fail, notFound } from "../utils/response";

// Buyer "notify me when back in stock" alerts.
//   POST   /api/v1/stock-alerts            { part_id }  subscribe (part must be out of stock)
//   DELETE /api/v1/stock-alerts/:partId                 unsubscribe
//   GET    /api/v1/stock-alerts/mine[?part_id=]         the buyer's alerts with part details
export const stockAlertsRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

const MAX_ACTIVE_ALERTS = 50;

stockAlertsRoutes.use("*", authMiddleware);

stockAlertsRoutes.post("/", async (c) => {
  const userId = c.get("user_id");
  const body = await c.req.json<{ part_id?: unknown }>().catch(() => ({ part_id: undefined }));
  const partId = Number(body.part_id);
  if (!Number.isInteger(partId) || partId <= 0) return fail(c, "Invalid part_id");

  const part = await c.env.DB.prepare("select id, quantity, status from parts where id = ?1")
    .bind(partId)
    .first<{ id: number; quantity: number; status: string }>();
  if (!part || part.status !== "active") return notFound(c, "Part");
  if (Number(part.quantity) > 0) return fail(c, "This part is in stock", 409);

  const active = await c.env.DB.prepare(
    "select count(*) as n from stock_alerts where user_id = ?1 and status = 'active'"
  )
    .bind(userId)
    .first<{ n: number }>();
  if (Number(active?.n || 0) >= MAX_ACTIVE_ALERTS) {
    return fail(c, `You can follow at most ${MAX_ACTIVE_ALERTS} parts`, 429);
  }

  // Re-subscribing after a notification starts a fresh alert (new id, so a
  // new WhatsApp message is allowed later).
  await c.env.DB.prepare(
    "delete from stock_alerts where part_id = ?1 and user_id = ?2 and status = 'notified'"
  )
    .bind(partId, userId)
    .run();
  await c.env.DB.prepare(
    "insert or ignore into stock_alerts (part_id, user_id) values (?1, ?2)"
  )
    .bind(partId, userId)
    .run();

  const alert = await c.env.DB.prepare(
    "select id, part_id, status, created_at, notified_at from stock_alerts where part_id = ?1 and user_id = ?2"
  )
    .bind(partId, userId)
    .first();
  return created(c, alert);
});

stockAlertsRoutes.delete("/:partId", async (c) => {
  const userId = c.get("user_id");
  const partId = Number(c.req.param("partId"));
  if (!Number.isInteger(partId) || partId <= 0) return fail(c, "Invalid part_id");
  await c.env.DB.prepare("delete from stock_alerts where part_id = ?1 and user_id = ?2")
    .bind(partId, userId)
    .run();
  return ok(c, { part_id: partId, removed: true });
});

stockAlertsRoutes.get("/mine", async (c) => {
  const userId = c.get("user_id");
  const partFilter = Number(c.req.query("part_id") || 0);
  const result = await c.env.DB.prepare(
    `select a.id, a.part_id, a.status, a.created_at, a.notified_at,
            p.slug, p.title, p.price, p.quantity, p.status as part_status,
            (select pi.url from part_images pi where pi.part_id = p.id
              order by pi.is_featured desc, pi.sort_order asc, pi.id asc limit 1) as image_url
     from stock_alerts a
     join parts p on p.id = a.part_id
     where a.user_id = ?1 and (?2 = 0 or a.part_id = ?2)
     order by (a.status = 'notified') desc, a.created_at desc
     limit 100`
  )
    .bind(userId, partFilter)
    .all();
  return ok(c, result.results || []);
});
