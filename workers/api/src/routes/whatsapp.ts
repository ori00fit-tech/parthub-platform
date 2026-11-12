import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { ok, fail } from "../utils/response";
import { authMiddleware } from "../middlewares/auth";
import { adminGuard } from "../middlewares/admin";
import { handleWhatsAppWebhook, sendWhatsAppTemplate, verifyMetaSignature } from "../utils/whatsapp";

export const whatsappRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

// GET /api/v1/whatsapp/health
whatsappRoutes.get("/health", (c) => ok(c, { status: "WhatsApp route OK" }));

// POST /api/v1/whatsapp/notify/order
// Sends paid WhatsApp messages on the business account: restricted to admins.
whatsappRoutes.post("/notify/order", authMiddleware, adminGuard, async (c) => {
  const { phone, order_ref, status } = await c.req.json<{
    phone: string;
    order_ref: string;
    status: string;
  }>();

  if (!phone || !order_ref) return fail(c, "phone and order_ref required");

  const sent = await sendWhatsAppTemplate(
    c.env,
    phone,
    "order_status_update",
    [order_ref, status],
    { language: "en" } // existing template was registered in English
  );

  return ok(c, { sent });
});

// ── Webhook for Meta (WhatsApp Cloud API) ──────────────────────────────
// Callback URL in Meta: https://api.parthub.autos/api/v1/whatsapp/webhook
// (infra/docs/whatsapp.md).

// GET: Meta's verification when the URL is saved. Answers hub.challenge
// only if hub.verify_token equals the WHATSAPP_VERIFY_TOKEN secret.
whatsappRoutes.get("/webhook", (c) => {
  const expected = c.env.WHATSAPP_VERIFY_TOKEN || "";
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token") || "";
  const challenge = c.req.query("hub.challenge") || "";
  if (mode === "subscribe" && expected.length >= 16 && token.length === expected.length) {
    let d = 0;
    for (let i = 0; i < token.length; i++) d |= token.charCodeAt(i) ^ expected.charCodeAt(i);
    if (d === 0 && /^[A-Za-z0-9_-]{1,200}$/.test(challenge)) return c.text(challenge, 200);
  }
  return c.text("Forbidden", 403);
});

// POST: delivery statuses and incoming messages. Accepted only when Meta's
// signature (X-Hub-Signature-256, app secret) is right. Answers 200 fast:
// Meta retries otherwise, and handling is idempotent.
whatsappRoutes.post("/webhook", async (c) => {
  const raw = await c.req.text();
  if (raw.length > 512 * 1024) return c.text("Too large", 413);
  if (!(await verifyMetaSignature(c.env.WHATSAPP_APP_SECRET, raw, c.req.header("x-hub-signature-256") ?? null))) {
    return c.text("Bad signature", 401);
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return c.text("Bad JSON", 400);
  }
  const result = await handleWhatsAppWebhook(c.env.DB, body);
  return c.json({ success: true, data: result });
});

