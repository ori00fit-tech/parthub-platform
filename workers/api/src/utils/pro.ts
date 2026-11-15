// ============================================================
// Professional accounts (mechanics, garages) — migrations/0040.
//  - A buyer asks (business name, city, ICE optional); PartHub checks and
//    approves or refuses with a reason (Admin › Pro accounts).
//  - A seller may set a pro price on a part (parts.pro_price, below the
//    public price).
//  - An approved pro sees that price in the catalog and pays it at
//    checkout; the order line records the price actually charged.
//  - Everyone else sees only that a pro price exists (has_pro_price), never
//    the amount.
// ============================================================
import type { Env } from "../types";
import { verifyToken } from "./auth";

export type ProStatus = "pending" | "approved" | "rejected";

export async function isApprovedPro(DB: D1Database, userId: number | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const row = await DB.prepare("select 1 as ok from pro_accounts p join users u on u.id = p.user_id where p.user_id = ?1 and p.status = 'approved' and u.is_active = 1")
    .bind(userId).first<{ ok: number }>();
  return !!row;
}

// Catalog pages are public: the token is optional there. Returns true only
// for a valid, current token of an approved pro (signed-out tokens and
// deactivated accounts count as anyone).
export async function viewerIsPro(env: Env, authorization: string | undefined): Promise<boolean> {
  if (!authorization?.startsWith("Bearer ")) return false;
  try {
    const payload = await verifyToken(authorization.slice(7), env.JWT_SECRET);
    const user = await env.DB.prepare("select token_version, is_active from users where id = ?1")
      .bind(payload.user_id).first<{ token_version: number; is_active: number }>();
    if (!user || !Number(user.is_active) || Number(payload.tv ?? 0) !== Number(user.token_version ?? 0)) return false;
    return isApprovedPro(env.DB, payload.user_id);
  } catch {
    return false;
  }
}

// The price a buyer pays for a part: the pro price for an approved pro when
// the seller set one (never more than the public price), else the price.
export function priceFor(part: { price: number; pro_price?: number | null }, pro: boolean): number {
  const price = Number(part.price);
  const proPrice = part.pro_price == null ? null : Number(part.pro_price);
  return pro && proPrice != null && proPrice > 0 && proPrice < price ? proPrice : price;
}

// A catalog row as this viewer may see it: pro_price for an approved pro,
// otherwise only has_pro_price (1 / 0).
export function showProPrice<T extends Record<string, unknown>>(row: T, pro: boolean): T & { has_pro_price: number } {
  const value = row.pro_price == null ? null : Number(row.pro_price);
  const has = value != null && value > 0 && value < Number(row.price) ? 1 : 0;
  const out: Record<string, unknown> = { ...row, has_pro_price: has };
  if (pro && has) out.pro_price = value;
  else delete out.pro_price;
  return out as T & { has_pro_price: number };
}

export const PRO_BUSINESS_MAX = 120;

export function readProRequest(body: Record<string, unknown>): { ok: true; business_name: string; city: string; ice: string | null } | { ok: false; error: string } {
  const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
  const business = clean(body.business_name, PRO_BUSINESS_MAX);
  const city = clean(body.city, 80);
  const ice = clean(body.ice, 20).replace(/\s/g, "");
  if (business.length < 2) return { ok: false, error: "Enter the name of your garage or workshop" };
  if (city.length < 2) return { ok: false, error: "City is required" };
  if (ice && !/^\d{15}$/.test(ice)) return { ok: false, error: "The ICE has 15 digits" };
  return { ok: true, business_name: business, city, ice: ice || null };
}
