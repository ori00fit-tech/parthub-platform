import { Hono } from "hono";
import type { Env, HonoVariables } from "../types";
import { ok, fail } from "../utils/response";
import { authMiddleware } from "../middlewares/auth";
import { adminGuard } from "../middlewares/admin";
import { sendWhatsAppTemplate } from "../utils/whatsapp";

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
