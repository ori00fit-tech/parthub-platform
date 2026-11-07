// Commission ledger (migrations/0023). A delivered order line becomes
// eligible once the returns window (RETURN_WINDOW_DAYS) is over and it has
// no unresolved claim. It is then recorded once, with the rate in force at
// that moment: "accrued", or "waived" (no commission) when a claim was
// resolved in the buyer's favour. Recording is lazy and idempotent: it runs
// when the revenue dashboard or a seller statement is opened.

import { RETURN_WINDOW_DAYS } from "./issues";

export const MAX_RATE_BPS = 2000; // 20%

export async function commissionRateBps(DB: D1Database): Promise<number> {
  const row = await DB.prepare("select value from platform_settings where key = 'commission_rate_bps'").first<{ value: string }>();
  const n = Number(row?.value ?? 0);
  return Number.isInteger(n) && n >= 0 && n <= MAX_RATE_BPS ? n : 0;
}

export async function setCommissionRateBps(DB: D1Database, bps: number, userId: number): Promise<void> {
  await DB.prepare(
    `insert into platform_settings (key, value, updated_by, updated_at) values ('commission_rate_bps', ?1, ?2, datetime('now'))
     on conflict(key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
  ).bind(String(bps), userId).run();
}

// Records every eligible line not recorded yet (one batch). Returns how many.
export async function accrueCommissions(DB: D1Database, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - RETURN_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 19).replace("T", " ");
  const rate = await commissionRateBps(DB);
  const res = await DB.prepare(
    `select oi.id, oi.order_id, oi.seller_id, oi.subtotal, oi.delivered_at,
            exists (select 1 from order_issues i where i.order_item_id = oi.id and i.status = 'closed' and i.outcome = 'buyer') as buyer_won
     from order_items oi
     where oi.status = 'delivered' and oi.delivered_at is not null and oi.delivered_at <= ?1
       and not exists (select 1 from commissions c where c.order_item_id = oi.id)
       and not exists (select 1 from order_issues i where i.order_item_id = oi.id and i.status != 'closed')
     limit 500`
  ).bind(cutoff).all<{ id: number; order_id: number; seller_id: number; subtotal: number; delivered_at: string; buyer_won: number }>();
  const rows = res.results || [];
  if (!rows.length) return 0;
  await DB.batch(
    rows.map((r) => {
      const waived = Number(r.buyer_won) === 1;
      const amount = waived ? 0 : Math.round((Number(r.subtotal) * rate) / 10_000);
      return DB.prepare(
        `insert or ignore into commissions (order_item_id, order_id, seller_id, base, rate_bps, amount, status, period, delivered_at)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
      ).bind(r.id, r.order_id, r.seller_id, Number(r.subtotal), waived ? 0 : rate, amount, waived ? "waived" : "accrued", r.delivered_at.slice(0, 7), r.delivered_at);
    })
  );
  return rows.length;
}

export function readPeriod(value: unknown): string | null {
  const v = String(value || "");
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : null;
}

export function currentPeriod(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

// The n months up to `last` (included), oldest first: ["2026-06", ...].
export function lastPeriods(last: string, n: number): string[] {
  const [y, m] = last.split("-").map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y!, m! - 1 - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}
