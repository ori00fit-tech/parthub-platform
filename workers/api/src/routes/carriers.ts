import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { listCarriers, loadCarrier, parseWebhook, recordEvent, verifyWebhook } from "../utils/carriers";

// Carriers (utils/carriers.ts, infra/docs/carriers.md).
export const carriersRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

const MAX_BODY = 256 * 1024;

// GET /api/v1/carriers — the active delivery companies (seller's "shipped" form).
carriersRoutes.get("/", async (c) => {
  const rows = await listCarriers(c.env.DB, true);
  c.header("Cache-Control", "public, max-age=300");
  return c.json({ success: true, data: rows.map((r) => ({ code: r.code, name: r.name, kind: r.kind, has_tracking_link: Boolean(r.tracking_url_template) })) });
});

// POST /api/v1/carriers/:code/webhook — status updates sent by a carrier.
// Authenticated with CARRIER_<CODE>_WEBHOOK_SECRET (HMAC-SHA256 signature
// header, or ?token= / X-Webhook-Token / Bearer). JSON or form body; one
// event or a list (field_map.events). Always answers quickly: carriers
// retry on errors, and every event is deduplicated.
carriersRoutes.post("/:code/webhook", async (c) => {
  const code = c.req.param("code").toLowerCase();
  const carrier = await loadCarrier(c.env.DB, code);
  if (!carrier || !carrier.webhook_enabled) return c.json({ success: false, error: "Unknown or disabled webhook" }, 404);
  const raw = await c.req.text();
  if (raw.length > MAX_BODY) return c.json({ success: false, error: "Body too large" }, 413);
  const auth = await verifyWebhook(c.env, code, c.req.raw, raw);
  if (auth === "no_secret") return c.json({ success: false, error: "Unknown or disabled webhook" }, 404);
  if (auth === "bad") return c.json({ success: false, error: "Bad signature or token" }, 401);

  let body: unknown;
  const type = c.req.header("content-type") || "";
  try {
    if (type.includes("application/x-www-form-urlencoded")) {
      const form: Record<string, string> = {};
      new URLSearchParams(raw).forEach((value, key) => (form[key] = value));
      body = form;
    } else body = JSON.parse(raw);
  } catch {
    return c.json({ success: false, error: "Body must be JSON or a form" }, 400);
  }
  const events = parseWebhook(carrier, body);
  const counts = { received: events.length, applied: 0, duplicate: 0, unknown_shipment: 0, unknown_status: 0 };
  for (const ev of events) counts[(await recordEvent(c.env.DB, code, ev, "carrier")).result]++;
  return c.json({ success: true, data: counts });
});
