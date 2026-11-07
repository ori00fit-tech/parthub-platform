// How the buyer gets the parts of each seller (migrations/0020):
//   delivery: the seller ships to the buyer's address (pending → confirmed →
//             shipped → delivered);
//   pickup:   the buyer collects at the store ("reserve & inspect"): the
//             seller confirms = keeps the part for PICKUP_HOLD_DAYS; the
//             buyer inspects it, pays there and gives the 6-digit code; the
//             seller enters the code = collected (delivered). Refused or not
//             collected → the seller cancels with a reason;
//   courier:  same as pickup, collected by someone the buyer sends.
// All lines of one seller in an order use the same method and code.

import type { LineStatus } from "./fulfillment";

export const FULFILLMENTS = ["delivery", "pickup", "courier"] as const;
export type Fulfillment = (typeof FULFILLMENTS)[number];
export const PICKUP_HOLD_DAYS = 3;
export const MAX_CODE_ATTEMPTS = 5;

export const isPickup = (f: unknown) => f === "pickup" || f === "courier";

// Seller's next steps for pickup / courier lines (no "shipped" step).
const PICKUP_NEXT: Record<string, LineStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["delivered", "cancelled"],
  processing: ["delivered", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function nextStatuses(status: string, fulfillment: string, deliveryNext: Record<string, LineStatus[]>): LineStatus[] {
  return (isPickup(fulfillment) ? PICKUP_NEXT : deliveryNext)[status] ?? [];
}

export function generatePickupCode(): string {
  const n = (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % 1_000_000;
  return String(n).padStart(6, "0");
}

export type SellerFulfillment = {
  id: number;
  name: string;
  location: string | null;
  delivery_enabled: number;
  pickup_enabled: number;
  pickup_address: string | null;
  pickup_hours: string | null;
};

// Methods a buyer may choose for these parts of one seller. Pickup needs
// an address; delivery needs every part to be deliverable.
export function allowedMethods(seller: SellerFulfillment, parts: Array<{ delivery_available: number }>): Fulfillment[] {
  const out: Fulfillment[] = [];
  if (Number(seller.delivery_enabled) && parts.every((p) => Number(p.delivery_available ?? 1))) out.push("delivery");
  if (Number(seller.pickup_enabled) && (seller.pickup_address || "").trim()) out.push("pickup", "courier");
  return out;
}

export async function loadSellerFulfillment(DB: D1Database, sellerIds: number[]): Promise<Map<number, SellerFulfillment>> {
  const ids = [...new Set(sellerIds)];
  const map = new Map<number, SellerFulfillment>();
  if (!ids.length) return map;
  const res = await DB.prepare(
    `select id, name, location, delivery_enabled, pickup_enabled, pickup_address, pickup_hours
     from sellers where id in (${ids.map((_, i) => `?${i + 1}`).join(",")})`
  ).bind(...ids).all<SellerFulfillment>();
  for (const s of res.results || []) map.set(s.id, s);
  return map;
}

// "2026-11-10 18:00:00" (UTC, SQLite format) PICKUP_HOLD_DAYS from now.
export function holdUntil(now = new Date()): string {
  return new Date(now.getTime() + PICKUP_HOLD_DAYS * 86400_000).toISOString().slice(0, 19).replace("T", " ");
}

// Constant-time comparison of two short codes.
export function sameCode(a: string, b: string): boolean {
  const x = String(a || "").replace(/\D/g, "");
  const y = String(b || "");
  if (x.length !== y.length || !y) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}
