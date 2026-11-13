// ============================================================
// Duplicate and fake orders (cash on delivery: an order costs the buyer
// nothing until the parcel arrives, so double taps and fake orders cost
// sellers a trip). Checked before the order is written:
//  1. Idempotency-Key (one per checkout attempt, sent by the site): the
//     same key again returns the first order. A unique index makes two
//     simultaneous requests with one key end with one order.
//  2. Same cart + phone within DUPLICATE_MINUTES: returns that order
//     (clients without the key, two tabs).
//  3. At most MAX_OPEN_ORDERS orders waiting for a seller's confirmation.
//  4. Rate limits per buyer and per phone (several accounts, one phone).
// ============================================================
import { LIMITS, blockedFor, recordAttempt } from "./rate-limit";
import { normalizeWhatsAppNumber } from "./whatsapp";

export const DUPLICATE_MINUTES = 10;
export const MAX_OPEN_ORDERS = 5; // ORDER_MAX_OPEN (Worker var) overrides it

// A key from the client: letters, digits, - and _, 8 to 100 characters.
export function readIdempotencyKey(value: string | null | undefined): string | null {
  const v = String(value ?? "").trim();
  return /^[A-Za-z0-9_-]{8,100}$/.test(v) ? v : null;
}

// What makes two orders "the same": the parts and quantities, and the phone.
export function cartHash(items: Map<number, number>, phone: string): string {
  const lines = [...items].sort((a, b) => a[0] - b[0]).map(([id, q]) => `${id}x${q}`).join(",");
  return `${lines}|${normalizeWhatsAppNumber(phone) || String(phone).replace(/\D/g, "")}`;
}

export const orderLimitKeys = (buyerId: number, phone: string) => {
  const digits = normalizeWhatsAppNumber(phone) || String(phone).replace(/\D/g, "");
  return { buyer: `order:buyer:${buyerId}`, phone: `order:phone:${digits}` };
};

export type GuardResult =
  | { kind: "ok" }
  | { kind: "existing"; reference: string; why: "same_key" | "same_cart" }
  | { kind: "refused"; status: 409 | 429; message: string };

export async function checkNewOrder(
  DB: D1Database,
  buyerId: number,
  key: string | null,
  hash: string,
  phone: string,
  maxOpen = MAX_OPEN_ORDERS
): Promise<GuardResult> {
  if (key) {
    const same = await DB.prepare("select reference from orders where buyer_id = ?1 and idempotency_key = ?2")
      .bind(buyerId, key).first<{ reference: string }>();
    if (same) return { kind: "existing", reference: same.reference, why: "same_key" };
  }
  const recent = await DB.prepare(
    `select reference from orders where buyer_id = ?1 and cart_hash = ?2 and status = 'pending'
       and created_at >= datetime('now', ?3) order by id desc limit 1`
  ).bind(buyerId, hash, `-${DUPLICATE_MINUTES} minutes`).first<{ reference: string }>();
  if (recent) return { kind: "existing", reference: recent.reference, why: "same_cart" };

  const keys = orderLimitKeys(buyerId, phone);
  const wait = await blockedFor(DB, [keys.buyer, keys.phone]);
  if (wait) {
    return { kind: "refused", status: 429, message: "Too many orders in a short time. Try again later, or write to PartHub on WhatsApp." };
  }
  const open = await DB.prepare("select count(*) as n from orders where buyer_id = ?1 and status = 'pending'")
    .bind(buyerId).first<{ n: number }>();
  if (Number(open?.n || 0) >= maxOpen) {
    return { kind: "refused", status: 409, message: `You already have ${maxOpen} orders waiting for the sellers' confirmation. Wait for them, or cancel one.` };
  }
  return { kind: "ok" };
}

// After an order is written: counts it against both limits.
export async function countOrder(DB: D1Database, buyerId: number, phone: string): Promise<void> {
  const keys = orderLimitKeys(buyerId, phone);
  await recordAttempt(DB, keys.buyer, LIMITS.ordersBuyer);
  await recordAttempt(DB, keys.phone, LIMITS.ordersPhone);
}
