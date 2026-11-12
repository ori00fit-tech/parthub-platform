// ============================================================
// Which event sends which WhatsApp template, to whom (see the catalog in
// utils/wa-templates.ts). Each function reads what the message needs,
// then calls notify() (language, de-duplication, log). Called with
// runInBackground() after the change is saved: never blocks the request.
// ============================================================
import type { Env } from "../types";
import { mad, moroccoDate, notify } from "./wa-notify";
import { waWord, type WaLang } from "./wa-templates";

type OrderSide = {
  order_id: number;
  reference: string;
  total: number;
  buyer_id: number;
  buyer_name: string;
  buyer_phone: string | null;
  buyer_locale: string | null;
  seller_id: number;
  seller_name: string;
  seller_contact: string | null;
  seller_locale: string | null;
  pickup_address: string | null;
  line_ref: number; // the seller's first line of the order: one message per seller and order
  amount: number; // what the seller's part of the order costs the buyer (lines + delivery)
  fulfillment: string;
  pickup_code: string | null;
  pickup_until: string | null;
  carrier: string | null;
  tracking: string | null;
};

// The order as seen by one of its sellers.
async function orderSide(env: Env, orderId: number, sellerId: number): Promise<OrderSide | null> {
  return env.DB.prepare(
    `select o.id as order_id, o.reference, o.total, o.buyer_id, bu.name as buyer_name,
            coalesce(nullif(trim(a.phone), ''), bu.phone) as buyer_phone, bu.locale as buyer_locale,
            s.id as seller_id, s.name as seller_name, coalesce(nullif(trim(s.whatsapp), ''), s.phone) as seller_contact,
            su.locale as seller_locale, s.pickup_address,
            (select min(id) from order_items where order_id = o.id and seller_id = s.id) as line_ref,
            (select coalesce(sum(subtotal), 0) from order_items where order_id = o.id and seller_id = s.id and status != 'cancelled')
              + coalesce(sh.fee, 0) as amount,
            (select fulfillment from order_items where order_id = o.id and seller_id = s.id order by id limit 1) as fulfillment,
            (select pickup_code from order_items where order_id = o.id and seller_id = s.id and pickup_code is not null limit 1) as pickup_code,
            (select max(pickup_until) from order_items where order_id = o.id and seller_id = s.id) as pickup_until,
            coalesce(c.name, sh.carrier) as carrier, sh.tracking_number as tracking
     from orders o
     join users bu on bu.id = o.buyer_id
     left join order_addresses a on a.order_id = o.id
     join sellers s on s.id = ?2
     join users su on su.id = s.user_id
     left join order_shipments sh on sh.order_id = o.id and sh.seller_id = s.id
     left join carriers c on c.code = sh.carrier
     where o.id = ?1`
  )
    .bind(orderId, sellerId)
    .first<OrderSide>()
    .then((r) => (r && r.line_ref ? r : null))
    .catch(() => null);
}

const trackPath = (reference: string) => `orders/${encodeURIComponent(reference)}/tracking`;

// ── Orders ─────────────────────────────────────────────────────────────

export async function waOrderReceived(env: Env, orderId: number): Promise<boolean> {
  const o = await env.DB.prepare(
    `select o.id, o.reference, o.total, o.buyer_id, coalesce(nullif(trim(a.phone), ''), u.phone) as phone, u.locale
     from orders o join users u on u.id = o.buyer_id left join order_addresses a on a.order_id = o.id where o.id = ?1`
  )
    .bind(orderId)
    .first<{ id: number; reference: string; total: number; buyer_id: number; phone: string | null; locale: string | null }>();
  if (!o) return false;
  return notify(env, {
    kind: "order_received",
    refId: o.id,
    recipient: `buyer:${o.buyer_id}`,
    phone: o.phone,
    locale: o.locale,
    template: "parthub_order_received",
    params: [o.reference, mad(o.total)],
    buttonPath: trackPath(o.reference),
  });
}

export type SellerStep = "confirmed" | "shipped" | "delivered" | "cancelled" | "delivery_failed";

// The seller (or PartHub for them) moved their lines of the order.
export async function waOrderStep(
  env: Env,
  orderId: number,
  sellerId: number,
  step: SellerStep,
  note?: string | null,
  noteWord = "not_given" // the reason sent when there is no note (WA_WORDS)
): Promise<boolean> {
  const o = await orderSide(env, orderId, sellerId);
  if (!o) return false;
  const buyer = { recipient: `buyer:${o.buyer_id}`, phone: o.buyer_phone, locale: o.buyer_locale, buttonPath: trackPath(o.reference) };
  // Pickup or courier: the part waits at the seller's, the code proves who collects it.
  const pickup = o.fulfillment === "pickup" || o.fulfillment === "courier";
  if (step === "confirmed") {
    if (pickup) {
      return notify(env, {
        ...buyer,
        kind: "pickup_ready",
        refId: o.line_ref,
        template: "parthub_pickup_ready",
        params: (lang) => [o.reference, o.seller_name, o.pickup_code || waWord("not_given", lang), moroccoDate(o.pickup_until), o.pickup_address || waWord("not_given", lang)],
      });
    }
    return notify(env, { ...buyer, kind: "order_confirmed", refId: o.line_ref, template: "parthub_order_confirmed", params: [o.seller_name, o.reference] });
  }
  if (step === "shipped") {
    return notify(env, {
      ...buyer,
      kind: "order_shipped",
      refId: o.line_ref,
      template: "parthub_order_shipped",
      params: (lang) => [o.reference, o.seller_name, o.carrier || waWord("not_given", lang), o.tracking || waWord("not_given", lang)],
    });
  }
  if (step === "delivered") {
    return notify(env, { ...buyer, kind: "order_delivered", refId: o.line_ref, template: "parthub_order_delivered", params: [o.reference] });
  }
  // Cancelled, before shipping or after a failed delivery: the buyer is told why.
  return notify(env, {
    ...buyer,
    kind: "order_cancelled",
    refId: o.line_ref,
    template: "parthub_order_cancelled",
    params: (lang) => [o.reference, o.seller_name, note || waWord(noteWord, lang)],
  });
}

// PartHub changed the whole order (admin): each seller's part, as above.
export async function waOrderStepAllSellers(env: Env, orderId: number, step: SellerStep): Promise<number> {
  const sellers = await env.DB.prepare("select distinct seller_id from order_items where order_id = ?1").bind(orderId).all<{ seller_id: number }>();
  let sent = 0;
  for (const s of sellers.results || []) if (await waOrderStep(env, orderId, s.seller_id, step, null, "cancelled_by_parthub")) sent++;
  return sent;
}

// ── Carrier events (webhook or admin entry) ───────────────────────────

export async function waShipmentEvent(
  env: Env,
  shipmentId: number,
  status: string,
  eventId: number | null,
  note: string | null,
  cod: number | null
): Promise<number> {
  const sh = await env.DB.prepare("select order_id, seller_id from order_shipments where id = ?1")
    .bind(shipmentId)
    .first<{ order_id: number; seller_id: number }>();
  if (!sh) return 0;
  const o = await orderSide(env, sh.order_id, sh.seller_id);
  if (!o) return 0;
  const buyer = { recipient: `buyer:${o.buyer_id}`, phone: o.buyer_phone, locale: o.buyer_locale, buttonPath: trackPath(o.reference) };
  const seller = { recipient: `seller:${o.seller_id}`, phone: o.seller_contact, locale: o.seller_locale, buttonPath: `orders/${o.order_id}` };
  let sent = 0;
  if (status === "out_for_delivery") {
    if (await notify(env, { ...buyer, kind: "out_for_delivery", refId: o.line_ref, template: "parthub_out_for_delivery", params: [o.reference, mad(o.amount)] })) sent++;
  } else if (status === "failed_attempt") {
    if (
      await notify(env, {
        ...buyer,
        kind: "delivery_attempt_failed",
        refId: eventId || o.line_ref,
        template: "parthub_delivery_attempt_failed",
        params: (lang) => [o.reference, o.carrier || waWord("not_given", lang), note || waWord("not_given", lang)],
      })
    )
      sent++;
  } else if (status === "delivered") {
    if (await notify(env, { ...buyer, kind: "order_delivered", refId: o.line_ref, template: "parthub_order_delivered", params: [o.reference] })) sent++;
    if (
      await notify(env, {
        ...seller,
        kind: "carrier_delivered",
        refId: o.line_ref,
        template: "parthub_carrier_delivered",
        params: (lang) => [o.reference, o.carrier || waWord("not_given", lang), cod !== null && cod !== undefined ? mad(cod) : waWord("not_given", lang)],
      })
    )
      sent++;
  } else if (status === "returning") {
    if (
      await notify(env, {
        ...buyer,
        kind: "delivery_returning",
        refId: o.line_ref,
        template: "parthub_delivery_returning",
        params: (lang) => [o.reference, note || waWord("not_given", lang)],
      })
    )
      sent++;
  } else if (status === "returned") {
    if (
      await notify(env, {
        ...seller,
        kind: "delivery_returned",
        refId: o.line_ref,
        template: "parthub_delivery_returned",
        params: (lang) => [o.reference, o.carrier || waWord("not_given", lang), note || waWord("not_given", lang)],
      })
    )
      sent++;
  }
  return sent;
}

// ── Claims (returns) ───────────────────────────────────────────────────

export type ClaimEvent = "opened" | "accepted" | "refused" | "refunded" | "escalated" | "withdrawn" | "decided_buyer" | "decided_seller";

// Who hears about each claim event, and the status words they get.
const CLAIM_WORDS: Record<ClaimEvent, { buyer?: string; seller?: string }> = {
  opened: {},
  accepted: { buyer: "claim_accepted" },
  refused: { buyer: "claim_refused" },
  refunded: { buyer: "claim_refunded" },
  escalated: { seller: "claim_escalated" },
  withdrawn: { seller: "claim_withdrawn" },
  decided_buyer: { buyer: "claim_decided_buyer", seller: "claim_decided_buyer" },
  decided_seller: { buyer: "claim_closed_seller", seller: "claim_closed_seller" },
};

export async function waClaimEvent(env: Env, issueId: number, event: ClaimEvent): Promise<number> {
  const i = await env.DB.prepare(
    `select i.id, i.reason, i.buyer_id, i.seller_id, o.id as order_id, o.reference, oi.title as part,
            coalesce(nullif(trim(a.phone), ''), bu.phone) as buyer_phone, bu.locale as buyer_locale,
            coalesce(nullif(trim(s.whatsapp), ''), s.phone) as seller_contact, su.locale as seller_locale
     from order_issues i
     join orders o on o.id = i.order_id
     join order_items oi on oi.id = i.order_item_id
     join users bu on bu.id = i.buyer_id
     left join order_addresses a on a.order_id = i.order_id
     join sellers s on s.id = i.seller_id
     join users su on su.id = s.user_id
     where i.id = ?1`
  )
    .bind(issueId)
    .first<{
      id: number; reason: string; buyer_id: number; seller_id: number; order_id: number; reference: string; part: string;
      buyer_phone: string | null; buyer_locale: string | null; seller_contact: string | null; seller_locale: string | null;
    }>();
  if (!i) return 0;
  const seller = { recipient: `seller:${i.seller_id}`, phone: i.seller_contact, locale: i.seller_locale, buttonPath: "issues" };
  let sent = 0;
  if (event === "opened") {
    if (
      await notify(env, {
        ...seller,
        kind: "claim_opened",
        refId: i.id,
        template: "parthub_claim_opened",
        params: (lang: WaLang) => [i.reference, i.part, waWord(`reason_${i.reason}`, lang)],
      })
    )
      sent++;
    return sent;
  }
  const words = CLAIM_WORDS[event];
  if (words.buyer) {
    const word = words.buyer;
    if (
      await notify(env, {
        recipient: `buyer:${i.buyer_id}`,
        phone: i.buyer_phone,
        locale: i.buyer_locale,
        buttonPath: trackPath(i.reference),
        kind: `claim_${event}`,
        refId: i.id,
        template: "parthub_claim_update",
        params: (lang) => [i.reference, i.part, waWord(word, lang)],
      })
    )
      sent++;
  }
  if (words.seller) {
    const word = words.seller;
    if (
      await notify(env, {
        ...seller,
        kind: `claim_${event}`,
        refId: i.id,
        template: "parthub_seller_claim_update",
        params: (lang) => [i.reference, i.part, waWord(word, lang)],
      })
    )
      sent++;
  }
  return sent;
}

// ── Store, parts, account ──────────────────────────────────────────────

const minuteRef = () => Math.floor(Date.now() / 60_000); // a double click sends once

export async function waStoreStatus(env: Env, sellerId: number, status: string, note: string | null): Promise<boolean> {
  if (!["active", "rejected", "suspended"].includes(status)) return false;
  const s = await env.DB.prepare(
    `select s.id, s.name, coalesce(nullif(trim(s.whatsapp), ''), s.phone) as contact, u.locale
     from sellers s join users u on u.id = s.user_id where s.id = ?1`
  )
    .bind(sellerId)
    .first<{ id: number; name: string; contact: string | null; locale: string | null }>();
  if (!s) return false;
  const base = { refId: minuteRef(), recipient: `seller:${s.id}`, phone: s.contact, locale: s.locale };
  if (status === "active") {
    return notify(env, { ...base, kind: "store_approved", template: "parthub_store_approved", params: [s.name], buttonPath: "parts" });
  }
  return notify(env, {
    ...base,
    kind: `store_${status}`,
    template: "parthub_store_blocked",
    params: (lang) => [s.name, note || waWord("not_given", lang)],
  });
}

// After a review (one part or a batch): one message per seller.
export async function waPartsReviewed(env: Env, partIds: number[], status: string): Promise<number> {
  if (!partIds.length || (status !== "active" && status !== "rejected")) return 0;
  const marks = partIds.map((_, i) => `?${i + 1}`).join(",");
  const rows = await env.DB.prepare(
    `select p.seller_id, count(*) as n, coalesce(nullif(trim(s.whatsapp), ''), s.phone) as contact, u.locale
     from parts p join sellers s on s.id = p.seller_id join users u on u.id = s.user_id
     where p.id in (${marks}) group by p.seller_id`
  )
    .bind(...partIds)
    .all<{ seller_id: number; n: number; contact: string | null; locale: string | null }>();
  let sent = 0;
  for (const r of rows.results || []) {
    const approved = status === "active" ? Number(r.n) : 0;
    const rejected = status === "rejected" ? Number(r.n) : 0;
    if (
      await notify(env, {
        kind: `parts_reviewed_${status}`,
        refId: minuteRef(),
        recipient: `seller:${r.seller_id}`,
        phone: r.contact,
        locale: r.locale,
        template: "parthub_parts_reviewed",
        params: [String(approved), String(rejected)],
        buttonPath: "parts",
      })
    )
      sent++;
  }
  return sent;
}

export async function waPasswordChanged(env: Env, userId: number, tokenVersion: number): Promise<boolean> {
  const u = await env.DB.prepare(
    `select u.id, u.name, u.locale, coalesce(nullif(trim(u.phone), ''), nullif(trim(s.whatsapp), ''), s.phone) as phone
     from users u left join sellers s on s.user_id = u.id where u.id = ?1`
  )
    .bind(userId)
    .first<{ id: number; name: string; locale: string | null; phone: string | null }>();
  if (!u) return false;
  return notify(env, {
    kind: "password_changed",
    refId: tokenVersion,
    recipient: `user:${u.id}`,
    phone: u.phone,
    locale: u.locale,
    template: "parthub_password_changed",
    params: [u.name.split(" ")[0] || u.name, moroccoDate(new Date(), true)],
  });
}
