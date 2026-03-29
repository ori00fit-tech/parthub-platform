import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { ok, fail } from "../utils/response";

export const whatsappRoutes = new Hono<{ Bindings: Env; Variables: HonoVariables }>();

async function sendWhatsAppMessage(
  env: Env,
  to: string,
  template: string,
  params: string[]
): Promise<boolean> {
  const components = params.length
    ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }]
    : [];

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: template, language: { code: "en" }, components },
      }),
    }
  );

  return res.ok;
}

// GET /api/v1/whatsapp/health
whatsappRoutes.get("/health", (c) => ok(c, { status: "WhatsApp route OK" }));

// POST /api/v1/whatsapp/notify/order
whatsappRoutes.post("/notify/order", async (c) => {
  const { phone, order_ref, status } = await c.req.json<{
    phone: string;
    order_ref: string;
    status: string;
  }>();

  if (!phone || !order_ref) return fail(c, "phone and order_ref required");

  const sent = await sendWhatsAppMessage(
    c.env,
    phone,
    "order_status_update",
    [order_ref, status]
  );

  return ok(c, { sent });
});
