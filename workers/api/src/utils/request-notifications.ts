// ============================================================
// WhatsApp notifications for "Request a part"
//
//  new_request    → matching sellers, when a buyer posts a request
//  new_offer      → the buyer, the first time a seller offers on it
//  offer_accepted → the seller, when the buyer accepts their offer
//
// Every message is claimed in whatsapp_notifications first (UNIQUE on
// kind + ref + recipient), so retries never double-send. Sellers get at most
// MAX_SELLER_ALERTS_PER_DAY new-request alerts. Nothing runs when WhatsApp
// isn't configured.
// ============================================================
import type { Env } from "../types";
import { isWhatsAppConfigured, sendWhatsAppTemplate } from "./whatsapp";

export const TEMPLATES = {
  newRequest: "parthub_new_request",
  newOffer: "parthub_new_offer",
  offerAccepted: "parthub_offer_accepted",
} as const;

const MAX_SELLERS_PER_REQUEST = 25;
const MAX_SELLER_ALERTS_PER_DAY = 10;

type Kind = "new_request" | "new_offer" | "offer_accepted" | "new_order";

function storefrontUrl(env: Env) {
  return (env.STOREFRONT_URL || "https://parthub.autos").replace(/\/$/, "");
}
function sellerPortalUrl(env: Env) {
  return (env.SELLER_PORTAL_URL || "https://seller.parthub.autos").replace(/\/$/, "");
}

function formatMAD(cents: number) {
  return `${(cents / 100).toFixed(2)} MAD`;
}

// Returns true if this (kind, ref, recipient) hasn't been sent before.
async function claim(env: Env, kind: Kind, refId: number, recipient: string): Promise<boolean> {
  const res = await env.DB.prepare(
    "insert or ignore into whatsapp_notifications (kind, ref_id, recipient) values (?1, ?2, ?3)"
  )
    .bind(kind, refId, recipient)
    .run();
  return Boolean(res.meta?.changes);
}

// Keeps WhatsApp's message id: its delivery status arrives by webhook.
async function markSent(env: Env, kind: Kind, refId: number, recipient: string, waId: string) {
  await env.DB.prepare(
    "update whatsapp_notifications set sent = 1, wa_message_id = ?4, status = 'sent', status_at = datetime('now') where kind = ?1 and ref_id = ?2 and recipient = ?3"
  )
    .bind(kind, refId, recipient, waId)
    .run();
}

async function deliver(
  env: Env,
  kind: Kind,
  refId: number,
  recipient: string,
  phone: string,
  template: string,
  params: string[]
): Promise<boolean> {
  if (!(await claim(env, kind, refId, recipient))) return false;
  const sent = await sendWhatsAppTemplate(env, phone, template, params);
  if (sent) await markSent(env, kind, refId, recipient, sent);
  return Boolean(sent);
}

export async function notifySellersOfNewRequest(env: Env, requestId: number): Promise<number> {
  if (!isWhatsAppConfigured(env)) return 0;

  const request = await env.DB.prepare(
    "select id, make, model, year, part_name, city, category_id from part_requests where id = ?1"
  )
    .bind(requestId)
    .first<{
      id: number; make: string; model: string; year: number | null;
      part_name: string; city: string; category_id: number | null;
    }>();
  if (!request) return 0;

  // Active sellers that stock this make (via compatibility) or this category,
  // have a contact number, and haven't hit today's alert cap.
  const sellers = await env.DB.prepare(
    `select s.id, coalesce(nullif(trim(s.whatsapp), ''), s.phone) as contact
     from sellers s
     where s.status = 'active'
       and coalesce(nullif(trim(s.whatsapp), ''), nullif(trim(s.phone), '')) is not null
       and (
         exists (
           select 1 from parts p join part_compatibility pc on pc.part_id = p.id
           where p.seller_id = s.id and lower(pc.make) = lower(?1)
         )
         or (?2 is not null and exists (
           select 1 from parts p where p.seller_id = s.id and p.category_id = ?2
         ))
       )
       and (
         select count(*) from whatsapp_notifications n
         where n.recipient = 'seller:' || s.id and n.kind = 'new_request'
           and n.created_at > datetime('now', '-1 day')
       ) < ?3
     order by s.id
     limit ?4`
  )
    .bind(request.make, request.category_id, MAX_SELLER_ALERTS_PER_DAY, MAX_SELLERS_PER_REQUEST)
    .all<{ id: number; contact: string }>();

  const vehicle = [request.make, request.model, request.year].filter(Boolean).join(" ");
  const link = `${sellerPortalUrl(env)}/requests/${request.id}`;

  let sent = 0;
  for (const seller of sellers.results || []) {
    const ok = await deliver(
      env, "new_request", request.id, `seller:${seller.id}`, seller.contact,
      TEMPLATES.newRequest, [request.part_name, vehicle, request.city, link]
    );
    if (ok) sent++;
  }
  return sent;
}

export async function notifyBuyerOfNewOffer(env: Env, offerId: number): Promise<boolean> {
  if (!isWhatsAppConfigured(env)) return false;

  const row = await env.DB.prepare(
    `select o.id, o.price, r.id as request_id, r.buyer_id, r.phone, r.part_name, s.name as seller_name
     from request_offers o
     join part_requests r on r.id = o.request_id
     join sellers s on s.id = o.seller_id
     where o.id = ?1`
  )
    .bind(offerId)
    .first<{
      id: number; price: number; request_id: number; buyer_id: number;
      phone: string; part_name: string; seller_name: string;
    }>();
  if (!row) return false;

  return deliver(
    env, "new_offer", row.id, `buyer:${row.buyer_id}`, row.phone, TEMPLATES.newOffer,
    [row.part_name, row.seller_name, formatMAD(row.price), `${storefrontUrl(env)}/requests/${row.request_id}`]
  );
}

export async function notifySellerOfAcceptance(env: Env, offerId: number): Promise<boolean> {
  if (!isWhatsAppConfigured(env)) return false;

  const row = await env.DB.prepare(
    `select o.id, o.seller_id, r.id as request_id, r.part_name, u.name as buyer_name,
       coalesce(nullif(trim(s.whatsapp), ''), s.phone) as contact
     from request_offers o
     join part_requests r on r.id = o.request_id
     join users u on u.id = r.buyer_id
     join sellers s on s.id = o.seller_id
     where o.id = ?1 and o.status = 'accepted'`
  )
    .bind(offerId)
    .first<{
      id: number; seller_id: number; request_id: number;
      part_name: string; buyer_name: string; contact: string | null;
    }>();
  if (!row?.contact) return false;

  return deliver(
    env, "offer_accepted", row.id, `seller:${row.seller_id}`, row.contact, TEMPLATES.offerAccepted,
    [row.part_name, row.buyer_name, `${sellerPortalUrl(env)}/requests/${row.request_id}`]
  );
}

// A new order for a seller (one message per seller and order): reference,
// what was ordered, what they collect (their lines + their delivery fee),
// the buyer's city, and the link to the order in the seller portal.
// Template parthub_new_order (infra/docs/whatsapp.md).
export async function notifySellersOfNewOrder(env: Env, orderId: number): Promise<number> {
  if (!isWhatsAppConfigured(env)) return 0;
  const order = await env.DB.prepare(
    `select o.id, o.reference, a.city from orders o left join order_addresses a on a.order_id = o.id where o.id = ?1`
  ).bind(orderId).first<{ id: number; reference: string; city: string | null }>();
  if (!order) return 0;
  const sellers = await env.DB.prepare(
    `select s.id, coalesce(nullif(trim(s.whatsapp), ''), s.phone) as contact,
            group_concat(oi.quantity || ' × ' || oi.title, ', ') as items,
            sum(oi.subtotal) + coalesce((select sh.fee from order_shipments sh where sh.order_id = oi.order_id and sh.seller_id = s.id), 0) as amount
     from order_items oi join sellers s on s.id = oi.seller_id
     where oi.order_id = ?1 and oi.status != 'cancelled'
     group by s.id`
  ).bind(orderId).all<{ id: number; contact: string | null; items: string; amount: number }>();
  let sent = 0;
  for (const s of sellers.results || []) {
    if (!s.contact) continue;
    const items = s.items.length > 200 ? `${s.items.slice(0, 197)}...` : s.items;
    const ok = await deliver(env, "new_order", order.id, `seller:${s.id}`, s.contact, "parthub_new_order", [
      order.reference,
      items,
      `${(Number(s.amount) / 100).toFixed(2)} MAD`,
      order.city || "-",
      `${sellerPortalUrl(env)}/orders/${order.id}`,
    ]);
    if (ok) sent++;
  }
  return sent;
}

