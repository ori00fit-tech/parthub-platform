// Commission ledger (migrations/0023, rules in 0024).
//
// A delivered order line is final once its returns window
// (RETURN_WINDOW_DAYS after delivery) is over and it has no unresolved
// claim. It is then recorded once (UNIQUE order_item_id):
//   - the rate is the one in force on the day the window ended
//     (commission_rates, dated), never the rate of the day the ledger is
//     computed: recording later, or changing the rate later, gives the same
//     result;
//   - the base is what the buyer kept: the line subtotal minus the refunds
//     of claims closed for the buyer (order_issues.refund_amount, NULL =
//     the whole line). Delivery fees are never included;
//   - nothing kept → "waived" (no commission).
// Recording runs every day (scheduled handler in src/index.ts) and when the
// revenue page or a statement is opened; both give the same rows.
// A higher rate needs RATE_NOTICE_DAYS of notice; rates are never edited,
// only scheduled or (before they start) cancelled. Every change is kept in
// commission_events.

import { RETURN_WINDOW_DAYS } from "./issues";

export const MAX_RATE_BPS = 2000; // 20%
export const RATE_NOTICE_DAYS = 30;
const DAY = 86_400_000;

// 'YYYY-MM-DD HH:MM:SS' (UTC), the format D1's datetime('now') uses.
export function sqlTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export type RateRow = {
  id: number;
  rate_bps: number;
  effective_from: string;
  note: string | null;
  created_by: number | null;
  created_at: string;
  cancelled_at: string | null;
};

// The rate in force at `at` (default: now).
export async function rateAt(DB: D1Database, at: string): Promise<number> {
  const row = await DB.prepare(
    `select rate_bps from commission_rates where cancelled_at is null and effective_from <= ?1
     order by effective_from desc, id desc limit 1`
  ).bind(at).first<{ rate_bps: number }>();
  return Number(row?.rate_bps ?? 0);
}

export async function commissionRateBps(DB: D1Database, now = new Date()): Promise<number> {
  return rateAt(DB, sqlTime(now));
}

// Rates not in force yet (what sellers are told about), oldest first.
export async function upcomingRates(DB: D1Database, now = new Date()): Promise<RateRow[]> {
  const res = await DB.prepare(
    `select * from commission_rates where cancelled_at is null and effective_from > ?1 order by effective_from, id`
  ).bind(sqlTime(now)).all<RateRow>();
  return res.results || [];
}

export async function rateHistory(DB: D1Database): Promise<RateRow[]> {
  const res = await DB.prepare("select * from commission_rates order by effective_from desc, id desc limit 50").all<RateRow>();
  return res.results || [];
}

// Reads "5" / "2,5" (percent) → basis points, or null when out of range.
export function readRatePercent(value: unknown): number | null {
  const raw = String(value ?? "").replace(",", ".").trim();
  if (!raw) return null;
  const pct = Number(raw);
  const bps = Math.round(pct * 100);
  return Number.isFinite(pct) && bps >= 0 && bps <= MAX_RATE_BPS ? bps : null;
}

// Reads 'YYYY-MM-DD' (start of that day, UTC) or a full date-time.
export function readEffectiveFrom(value: unknown): string | null {
  const v = String(value || "").trim();
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::(\d{2}))?)?Z?$/.exec(v);
  if (!m) return null;
  const t = Date.parse(`${m[1]}T${m[2] || "00:00"}:${m[3] || "00"}Z`);
  return Number.isNaN(t) ? null : sqlTime(new Date(t));
}

export type ScheduleResult = { ok: true; id: number } | { ok: false; code: string; error: string };

// Schedules `bps` from `effectiveFrom`. Never in the past; a rate higher
// than the one that would otherwise apply then needs RATE_NOTICE_DAYS.
export async function scheduleRate(
  DB: D1Database,
  bps: number,
  effectiveFrom: string,
  userId: number,
  note: string | null,
  now = new Date()
): Promise<ScheduleResult> {
  const nowText = sqlTime(now);
  if (effectiveFrom < nowText) return { ok: false, code: "PAST_DATE", error: "A rate cannot start in the past" };
  const before = await rateAt(DB, effectiveFrom);
  if (bps === before) return { ok: false, code: "SAME_RATE", error: "This rate already applies on that date" };
  const earliest = sqlTime(new Date(now.getTime() + RATE_NOTICE_DAYS * DAY));
  if (bps > before && effectiveFrom < earliest) {
    return {
      ok: false,
      code: "NOTICE_REQUIRED",
      error: `A higher commission needs ${RATE_NOTICE_DAYS} days notice to sellers: start it on ${earliest.slice(0, 10)} or later`,
    };
  }
  const res = await DB.prepare(
    "insert into commission_rates (rate_bps, effective_from, note, created_by) values (?1, ?2, ?3, ?4)"
  ).bind(bps, effectiveFrom, note, userId).run();
  const id = Number(res.meta?.last_row_id);
  await DB.prepare(
    "insert into commission_events (action, rate_id, old_amount, new_amount, actor, note) values ('rate_scheduled', ?1, ?2, ?3, ?4, ?5)"
  ).bind(id, before, bps, `admin:${userId}`, note).run();
  return { ok: true, id };
}

// Cancels a rate that is not in force yet.
export async function cancelRate(DB: D1Database, id: number, userId: number, now = new Date()): Promise<ScheduleResult> {
  const row = await DB.prepare("select * from commission_rates where id = ?1").bind(id).first<RateRow>();
  if (!row || row.cancelled_at) return { ok: false, code: "NOT_FOUND", error: "Rate not found" };
  if (row.effective_from <= sqlTime(now)) return { ok: false, code: "IN_FORCE", error: "A rate already in force cannot be cancelled: schedule a new one" };
  await DB.batch([
    DB.prepare("update commission_rates set cancelled_at = datetime('now'), cancelled_by = ?2 where id = ?1 and cancelled_at is null").bind(id, userId),
    DB.prepare("insert into commission_events (action, rate_id, old_amount, actor) values ('rate_cancelled', ?1, ?2, ?3)").bind(id, row.rate_bps, `admin:${userId}`),
  ]);
  return { ok: true, id };
}

// Records every eligible line not recorded yet (one batch, optionally one
// seller's lines only). Returns how many.
export async function accrueCommissions(DB: D1Database, now = new Date(), sellerId?: number): Promise<number> {
  const cutoff = sqlTime(new Date(now.getTime() - RETURN_WINDOW_DAYS * DAY));
  const res = await DB.prepare(
    `select oi.id, oi.order_id, oi.seller_id, oi.subtotal, oi.delivered_at,
            coalesce((select sum(case when i.refund_amount is null then oi.subtotal else i.refund_amount end)
                      from order_issues i where i.order_item_id = oi.id and i.status = 'closed' and i.outcome = 'buyer'), 0) as refunded,
            coalesce((select r.rate_bps from commission_rates r
                      where r.cancelled_at is null and r.effective_from <= datetime(oi.delivered_at, '+${RETURN_WINDOW_DAYS} days')
                      order by r.effective_from desc, r.id desc limit 1), 0) as rate
     from order_items oi
     where oi.status = 'delivered' and oi.delivered_at is not null and oi.delivered_at <= ?1
       ${sellerId ? "and oi.seller_id = ?2" : ""}
       and not exists (select 1 from commissions c where c.order_item_id = oi.id)
       and not exists (select 1 from order_issues i where i.order_item_id = oi.id and i.status != 'closed')
     order by oi.delivered_at
     limit 500`
  ).bind(...(sellerId ? [cutoff, sellerId] : [cutoff]))
    .all<{ id: number; order_id: number; seller_id: number; subtotal: number; delivered_at: string; refunded: number; rate: number }>();
  const rows = res.results || [];
  if (!rows.length) return 0;
  await DB.batch(
    rows.map((r) => {
      const line = commissionFor(Number(r.subtotal), Number(r.refunded), Number(r.rate));
      return DB.prepare(
        `insert or ignore into commissions (order_item_id, order_id, seller_id, base, rate_bps, amount, status, period, delivered_at)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
      ).bind(r.id, r.order_id, r.seller_id, line.base, line.rate_bps, line.amount, line.status, r.delivered_at.slice(0, 7), r.delivered_at);
    })
  );
  return rows.length;
}

// Commission on one line, integers in centimes. Rounded half up.
export function commissionFor(subtotal: number, refunded: number, rateBps: number) {
  const base = Math.max(0, subtotal - Math.max(0, refunded));
  if (base === 0) return { base: 0, rate_bps: 0, amount: 0, status: "waived" as const };
  return { base, rate_bps: rateBps, amount: Math.floor((base * rateBps + 5_000) / 10_000), status: "accrued" as const };
}

// Admin: no commission on this line (goodwill, a late return...). Only
// before it is invoiced. Kept in commission_events.
export async function waiveCommission(DB: D1Database, id: number, actor: string, note: string): Promise<"ok" | "not_found" | "locked"> {
  const row = await DB.prepare("select id, amount, status from commissions where id = ?1").bind(id).first<{ id: number; amount: number; status: string }>();
  if (!row) return "not_found";
  if (row.status !== "accrued") return "locked";
  await DB.batch([
    DB.prepare("update commissions set status = 'waived', amount = 0 where id = ?1 and status = 'accrued'").bind(id),
    DB.prepare("insert into commission_events (action, commission_id, old_amount, new_amount, actor, note) values ('waived', ?1, ?2, 0, ?3, ?4)")
      .bind(id, row.amount, actor, note),
  ]);
  return "ok";
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
