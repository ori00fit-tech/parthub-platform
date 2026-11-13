// ============================================================
// Account deletion (migrations/0034). Required by the App Store, Google
// Play and law 09-08, done so that PartHub keeps what it must keep:
//  1. Request (signed in, with the password): the account is closed at
//     once — every device signed out, a seller's store hidden — nothing
//     erased. Refused while something is open: orders not delivered or
//     cancelled, claims, parts still in their 7-day returns window, money
//     owed to PartHub.
//  2. 30 days to change one's mind: signing in again cancels it and gives
//     the store back as it was.
//  3. After 30 days (daily job): personal data erased — name, e-mail,
//     phone, password, addresses, WhatsApp conversations, alerts. Orders,
//     invoices, commissions and reviews stay, attached to "Deleted user
//     #id", so accounting and statistics stay right.
// Admin accounts are not deleted this way.
// ============================================================
import type { Env } from "../types";
import { normalizeWhatsAppNumber } from "./whatsapp";

export const GRACE_DAYS = 30;
const OPEN_ORDER = "('pending','confirmed','processing','shipped')";

export type Blocker = "open_orders" | "open_claims" | "returns_window" | "money_owed" | "admin";

// What stops the account from being deleted now (empty: nothing).
export async function deletionBlockers(DB: D1Database, userId: number): Promise<Blocker[]> {
  const u = await DB.prepare("select u.role, s.id as seller_id from users u left join sellers s on s.user_id = u.id where u.id = ?1")
    .bind(userId).first<{ role: string; seller_id: number | null }>();
  if (!u) return [];
  if (u.role === "admin") return ["admin"];
  const out: Blocker[] = [];
  const one = async (sql: string, ...args: unknown[]) => Number((await DB.prepare(sql).bind(...args).first<{ n: number }>())?.n || 0);
  // As a buyer.
  if (await one(`select count(*) n from order_items oi join orders o on o.id = oi.order_id where o.buyer_id = ?1 and oi.status in ${OPEN_ORDER}`, userId)) out.push("open_orders");
  if (await one("select count(*) n from order_issues where buyer_id = ?1 and status != 'closed'", userId)) out.push("open_claims");
  // As a seller.
  if (u.seller_id) {
    const sid = u.seller_id;
    if (!out.includes("open_orders") && (await one(`select count(*) n from order_items where seller_id = ?1 and status in ${OPEN_ORDER}`, sid))) out.push("open_orders");
    if (!out.includes("open_claims") && (await one("select count(*) n from order_issues where seller_id = ?1 and status != 'closed'", sid))) out.push("open_claims");
    if (await one("select count(*) n from order_items where seller_id = ?1 and status = 'delivered' and delivered_at > datetime('now', '-7 days')", sid)) out.push("returns_window");
    const owed =
      (await one("select count(*) n from commission_invoices where seller_id = ?1 and status = 'issued' and amount > 0", sid)) +
      (await one("select count(*) n from commissions where seller_id = ?1 and status = 'accrued' and amount > 0", sid));
    if (owed) out.push("money_owed");
  }
  return out;
}

export async function requestDeletion(DB: D1Database, userId: number, reason: string | null): Promise<void> {
  const seller = await DB.prepare("select id, status from sellers where user_id = ?1").bind(userId).first<{ id: number; status: string }>();
  const stmts = [
    DB.prepare(
      "update users set deletion_requested_at = datetime('now'), token_version = token_version + 1, updated_at = datetime('now') where id = ?1"
    ).bind(userId),
    DB.prepare("insert into account_deletions (user_id, reason, seller_status_before) values (?1, ?2, ?3)").bind(userId, reason, seller?.status ?? null),
  ];
  if (seller) {
    stmts.push(
      DB.prepare("update sellers set status = 'suspended', moderation_note = 'Account deletion requested by the seller', updated_at = datetime('now') where id = ?1").bind(seller.id)
    );
  }
  await DB.batch(stmts);
}

// Signing in during the 30 days: the account comes back as it was.
export async function cancelDeletion(DB: D1Database, userId: number): Promise<boolean> {
  const req = await DB.prepare(
    "select id, seller_status_before from account_deletions where user_id = ?1 and cancelled_at is null and completed_at is null order by id desc limit 1"
  ).bind(userId).first<{ id: number; seller_status_before: string | null }>();
  const stmts = [
    DB.prepare("update users set deletion_requested_at = null, updated_at = datetime('now') where id = ?1").bind(userId),
  ];
  if (req) {
    stmts.push(DB.prepare("update account_deletions set cancelled_at = datetime('now') where id = ?1").bind(req.id));
    if (req.seller_status_before) {
      stmts.push(
        DB.prepare(
          "update sellers set status = ?2, moderation_note = null, updated_at = datetime('now') where user_id = ?1 and moderation_note = 'Account deletion requested by the seller'"
        ).bind(userId, req.seller_status_before)
      );
    }
  }
  await DB.batch(stmts);
  return Boolean(req);
}

// Erases the personal data of one account (orders and money records stay).
export async function eraseAccount(DB: D1Database, userId: number): Promise<void> {
  const u = await DB.prepare("select u.phone, s.id as seller_id, s.phone as s_phone, s.whatsapp as s_whatsapp from users u left join sellers s on s.user_id = u.id where u.id = ?1")
    .bind(userId).first<{ phone: string | null; seller_id: number | null; s_phone: string | null; s_whatsapp: string | null }>();
  if (!u) return;
  const numbers = [...new Set([u.phone, u.s_phone, u.s_whatsapp].map((p) => normalizeWhatsAppNumber(p)).filter(Boolean) as string[])];
  const label = `Deleted user #${userId}`;
  const stmts = [
    DB.prepare(
      `update users set name = ?2, email = ?3, phone = null, password_hash = '!', avatar_url = null, locale = null, is_active = 0,
         token_version = token_version + 1, deleted_at = datetime('now'), updated_at = datetime('now') where id = ?1`
    ).bind(userId, label, `deleted-${userId}@deleted.parthub.invalid`),
    // Addresses of the orders they placed: the order stays, not where they live.
    DB.prepare(
      `update order_addresses set full_name = ?2, phone = '', address_line1 = '', address_line2 = null, state = null, postal_code = null
       where order_id in (select id from orders where buyer_id = ?1)`
    ).bind(userId, label),
    DB.prepare("update order_items set collector_name = null, collector_phone = null where order_id in (select id from orders where buyer_id = ?1)").bind(userId),
    DB.prepare("update orders set notes = null where buyer_id = ?1").bind(userId),
    DB.prepare("update part_requests set phone = '', vin = null, status = case when status = 'open' then 'closed' else status end where buyer_id = ?1").bind(userId),
    DB.prepare("delete from stock_alerts where user_id = ?1").bind(userId),
    DB.prepare("delete from password_resets where user_id = ?1").bind(userId),
    DB.prepare("update whatsapp_notifications set payload = null where recipient in (?1, ?2)").bind(`buyer:${userId}`, `user:${userId}`),
    DB.prepare("update account_deletions set completed_at = datetime('now') where user_id = ?1 and cancelled_at is null and completed_at is null").bind(userId),
  ];
  for (const n of numbers) {
    stmts.push(DB.prepare("delete from whatsapp_messages where phone = ?1").bind(n));
    stmts.push(DB.prepare("delete from whatsapp_contacts where phone = ?1").bind(n));
  }
  if (u.seller_id) {
    stmts.push(
      DB.prepare(
        `update sellers set name = ?2, description = null, logo_url = null, banner_url = null, phone = null, whatsapp = null,
           pickup_address = null, pickup_hours = null, status = 'suspended', moderation_note = 'Account deleted', updated_at = datetime('now')
         where id = ?1`
      ).bind(u.seller_id, `Closed store #${u.seller_id}`),
      DB.prepare("update parts set status = 'archived', updated_at = datetime('now') where seller_id = ?1 and status != 'archived'").bind(u.seller_id),
      DB.prepare("update whatsapp_notifications set payload = null where recipient = ?1").bind(`seller:${u.seller_id}`)
    );
  }
  await DB.batch(stmts);
}

// The daily job: accounts whose 30 days are over.
export async function eraseDueAccounts(DB: D1Database, limit = 50): Promise<number> {
  const due = await DB.prepare(
    `select id from users where deletion_requested_at is not null and deleted_at is null
       and deletion_requested_at <= datetime('now', ?1) and role != 'admin' order by id limit ?2`
  ).bind(`-${GRACE_DAYS} days`, limit).all<{ id: number }>();
  for (const r of due.results || []) await eraseAccount(DB, r.id);
  return due.results?.length || 0;
}
