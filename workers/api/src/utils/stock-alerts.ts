// ============================================================
// "Notify me when back in stock"
//
// When a part is active and has stock again, every waiting alert on it is
// marked 'notified' (the buyer sees it in their account) and, when WhatsApp
// is configured, the buyer gets the `parthub_back_in_stock` template:
//   {{1}} part title · {{2}} price · {{3}} link to the part
// Each message is claimed in whatsapp_notifications first, so a retry never
// sends twice. Runs off the request path (see runInBackground).
// ============================================================
import type { Env } from "../types";
import { isWhatsAppConfigured, sendWhatsAppTemplate } from "./whatsapp";

export const BACK_IN_STOCK_TEMPLATE = "parthub_back_in_stock";
const MAX_ALERTS_PER_RUN = 200;

function storefrontUrl(env: Env) {
  return (env.STOREFRONT_URL || "https://parthub.autos").replace(/\/$/, "");
}

function formatMAD(cents: number) {
  return `${(cents / 100).toFixed(2)} MAD`;
}

// Returns how many buyers were notified (in-app); WhatsApp is best-effort on top.
export async function notifyBackInStock(env: Env, partId: number): Promise<number> {
  const part = await env.DB.prepare(
    "select id, slug, title, price, quantity, status from parts where id = ?1"
  )
    .bind(partId)
    .first<{ id: number; slug: string; title: string; price: number; quantity: number; status: string }>();
  if (!part || part.status !== "active" || Number(part.quantity) <= 0) return 0;

  const alerts = await env.DB.prepare(
    `select a.id, a.user_id, u.phone
     from stock_alerts a
     join users u on u.id = a.user_id
     where a.part_id = ?1 and a.status = 'active'
     order by a.id
     limit ?2`
  )
    .bind(partId, MAX_ALERTS_PER_RUN)
    .all<{ id: number; user_id: number; phone: string | null }>();
  const rows = alerts.results || [];
  if (!rows.length) return 0;

  // Mark first, so two restocks in a row don't process the same alerts twice.
  const ids = rows.map((r) => r.id);
  await env.DB.prepare(
    `update stock_alerts set status = 'notified', notified_at = datetime('now')
     where status = 'active' and id in (${ids.map((_, i) => `?${i + 1}`).join(",")})`
  )
    .bind(...ids)
    .run();

  if (isWhatsAppConfigured(env)) {
    const link = `${storefrontUrl(env)}/parts/${part.slug}`;
    for (const alert of rows) {
      if (!alert.phone) continue;
      const recipient = `buyer:${alert.user_id}`;
      const claimed = await env.DB.prepare(
        "insert or ignore into whatsapp_notifications (kind, ref_id, recipient) values ('back_in_stock', ?1, ?2)"
      )
        .bind(alert.id, recipient)
        .run();
      if (!claimed.meta?.changes) continue;
      const sent = await sendWhatsAppTemplate(env, alert.phone, BACK_IN_STOCK_TEMPLATE, [
        part.title,
        formatMAD(Number(part.price)),
        link,
      ]);
      if (sent) {
        await env.DB.prepare(
          "update whatsapp_notifications set sent = 1 where kind = 'back_in_stock' and ref_id = ?1 and recipient = ?2"
        )
          .bind(alert.id, recipient)
          .run();
      }
    }
  }

  return rows.length;
}
