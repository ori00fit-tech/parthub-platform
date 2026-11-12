// ============================================================
// Late shipments: a delivery marked shipped whose parcel has had no update
// (carrier, seller or PartHub) for LATE_DAYS days. A daily check (cron,
// src/index.ts) tells the buyer and the seller once per quiet period
// (order_shipments.delay_notified_at, cleared by the next update) and logs
// it on the order; Admin › Carriers lists them to follow up.
// ============================================================
import type { Env } from "../types";
import { logOrderEvent } from "./fulfillment";
import { notify } from "./wa-notify";
import { waWord } from "./wa-templates";

export const LATE_DAYS = 4; // Morocco: 24–72 h usually, a weekend on top

export type LateShipment = {
  shipment_id: number;
  order_id: number;
  reference: string;
  seller_id: number;
  seller_name: string;
  seller_contact: string | null;
  seller_locale: string | null;
  buyer_id: number;
  buyer_name: string;
  buyer_phone: string | null;
  buyer_locale: string | null;
  carrier: string | null;
  carrier_name: string | null;
  tracking_number: string | null;
  status: string | null;
  last_at: string;
  days: number;
  attempts: number;
  delay_notified_at: string | null;
};

export async function lateShipments(DB: D1Database, days = LATE_DAYS, limit = 200): Promise<LateShipment[]> {
  const res = await DB.prepare(
    `select sh.id as shipment_id, sh.order_id, o.reference, sh.seller_id, s.name as seller_name,
            coalesce(nullif(trim(s.whatsapp), ''), s.phone) as seller_contact, su.locale as seller_locale,
            o.buyer_id, bu.name as buyer_name, coalesce(nullif(trim(a.phone), ''), bu.phone) as buyer_phone, bu.locale as buyer_locale,
            sh.carrier, ca.name as carrier_name, sh.tracking_number, sh.status, coalesce(sh.status_at, sh.shipped_at) as last_at,
            cast(julianday('now') - julianday(coalesce(sh.status_at, sh.shipped_at)) as integer) as days,
            sh.attempts, sh.delay_notified_at
     from order_shipments sh
     join orders o on o.id = sh.order_id
     join sellers s on s.id = sh.seller_id
     join users su on su.id = s.user_id
     join users bu on bu.id = o.buyer_id
     left join order_addresses a on a.order_id = o.id
     left join carriers ca on ca.code = sh.carrier
     where coalesce(sh.status_at, sh.shipped_at) is not null
       and coalesce(sh.status, '') not in ('delivered', 'returned', 'cancelled')
       and julianday('now') - julianday(coalesce(sh.status_at, sh.shipped_at)) >= ?1
       and exists (select 1 from order_items oi where oi.order_id = sh.order_id and oi.seller_id = sh.seller_id
                   and oi.status = 'shipped' and oi.fulfillment = 'delivery')
     order by last_at asc
     limit ?2`
  ).bind(days, limit).all<LateShipment>();
  return res.results || [];
}

// The daily check. Returns how many shipments were newly found late.
export async function notifyLateShipments(env: Env): Promise<number> {
  const late = (await lateShipments(env.DB)).filter((l) => !l.delay_notified_at);
  const day = Math.floor(Date.now() / 86_400_000);
  for (const l of late) {
    const marked = await env.DB.prepare(
      "update order_shipments set delay_notified_at = datetime('now') where id = ?1 and delay_notified_at is null"
    ).bind(l.shipment_id).run();
    if (!Number(marked.meta?.changes)) continue;
    await logOrderEvent(env.DB, l.order_id, "shipping_delayed", "system", null);
    const days = String(l.days);
    await notify(env, {
      kind: "shipping_delayed",
      refId: day * 100000 + (l.shipment_id % 100000),
      recipient: `buyer:${l.buyer_id}`,
      phone: l.buyer_phone,
      locale: l.buyer_locale,
      template: "parthub_shipping_delayed",
      params: [l.reference, days],
      buttonPath: `orders/${encodeURIComponent(l.reference)}/tracking`,
    });
    await notify(env, {
      kind: "shipping_delayed",
      refId: day * 100000 + (l.shipment_id % 100000),
      recipient: `seller:${l.seller_id}`,
      phone: l.seller_contact,
      locale: l.seller_locale,
      template: "parthub_seller_shipping_delayed",
      params: (lang) => [l.reference, days, l.carrier_name || l.carrier || waWord("not_given", lang)],
      buttonPath: `orders/${l.order_id}`,
    });
  }
  return late.length;
}
