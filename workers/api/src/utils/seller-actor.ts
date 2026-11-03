import type { Env } from "../types";

export type ActorResult =
  | { ok: true; isAdmin: boolean; sellerId: number | null }
  | { ok: false; status: 403; code: string; message: string };

// Resolve which seller the authenticated user acts as.
// Admins may act on any seller; sellers only on their own, active store.
export async function resolveActor(c: {
  env: Env;
  get: (key: "user_id" | "user_role" | "seller_id") => unknown;
}): Promise<ActorResult> {
  const role = c.get("user_role");
  if (role === "admin") return { ok: true, isAdmin: true, sellerId: null };

  const sellerId = Number(c.get("seller_id"));
  const userId = Number(c.get("user_id"));
  if (!sellerId) {
    return { ok: false, status: 403, code: "SELLER_REQUIRED", message: "Seller account required" };
  }

  const seller = await c.env.DB.prepare(
    "select id, status from sellers where id = ?1 and user_id = ?2 limit 1"
  )
    .bind(sellerId, userId)
    .first<{ id: number; status: string }>();

  if (!seller) {
    return { ok: false, status: 403, code: "SELLER_REQUIRED", message: "Seller account required" };
  }
  if (seller.status !== "active") {
    return { ok: false, status: 403, code: "SELLER_INACTIVE", message: "Seller account is not active" };
  }

  return { ok: true, isAdmin: false, sellerId: seller.id };
}
