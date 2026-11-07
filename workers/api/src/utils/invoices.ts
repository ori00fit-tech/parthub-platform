// Commission invoices and payments (migrations/0025).
//
// One invoice per seller and delivery month, issued by an admin once the
// month is over and every delivered line of it is final (returns window
// closed, no open claim). It covers the seller's "accrued" commissions of
// that month (commissions.invoice_id → "invoiced"); its amount is their
// sum, fixed at issue. Payments (bank transfer, date, reference) are
// recorded against it; balance = amount - paid; never more than the
// balance. Fully paid → invoice and commissions "paid". An invoice with no
// payment can be cancelled: its commissions go back to "accrued".
// Every step is written in commission_events.

import { accrueCommissions, currentPeriod, sqlTime } from "./commissions";

export const PAYMENT_DAYS = 15;
export const PAYMENT_METHODS = ["bank_transfer", "cash", "cheque", "other"] as const;
const DAY = 86_400_000;

export type InvoiceRow = {
  id: number;
  number: string;
  seller_id: number;
  period: string;
  amount: number;
  status: "issued" | "paid" | "cancelled";
  due_date: string;
  note: string | null;
  issued_by: number | null;
  issued_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
};

type Result<T = { id: number }> = ({ ok: true } & T) | { ok: false; code: string; error: string };

export function readDay(value: unknown): string | null {
  const v = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const t = Date.parse(`${v}T00:00:00Z`);
  return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== v ? null : v;
}

// "1 250,50" / "1250.5" (MAD) → centimes, or null.
export function readMad(value: unknown): number | null {
  const n = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  if (!String(value ?? "").trim() || !Number.isFinite(n)) return null;
  const c = Math.round(n * 100);
  return c > 0 ? c : null;
}

// What a seller's month looks like for invoicing.
export async function invoiceDraft(DB: D1Database, sellerId: number, period: string, now = new Date()) {
  await accrueCommissions(DB, now, sellerId);
  const pending = await DB.prepare(
    `select count(*) as n from order_items oi
     where oi.seller_id = ?1 and oi.status = 'delivered' and substr(oi.delivered_at, 1, 7) = ?2
       and not exists (select 1 from commissions c where c.order_item_id = oi.id)`
  ).bind(sellerId, period).first<{ n: number }>();
  const due = await DB.prepare(
    `select count(*) as lines, coalesce(sum(amount), 0) as amount from commissions
     where seller_id = ?1 and period = ?2 and status = 'accrued' and invoice_id is null`
  ).bind(sellerId, period).first<{ lines: number; amount: number }>();
  const live = await DB.prepare(
    "select id, number, status from commission_invoices where seller_id = ?1 and period = ?2 and status != 'cancelled'"
  ).bind(sellerId, period).first<{ id: number; number: string; status: string }>();
  return {
    month_closed: period < currentPeriod(now),
    pending_lines: Number(pending?.n || 0),
    lines: Number(due?.lines || 0),
    amount: Number(due?.amount || 0),
    invoice: live ?? null,
  };
}

export async function issueInvoice(
  DB: D1Database,
  sellerId: number,
  period: string,
  userId: number,
  note: string | null,
  now = new Date()
): Promise<Result<{ id: number; number: string; amount: number }>> {
  const draft = await invoiceDraft(DB, sellerId, period, now);
  if (!draft.month_closed) return { ok: false, code: "MONTH_OPEN", error: "Invoice a month only once it is over" };
  if (draft.invoice) return { ok: false, code: "EXISTS", error: `This month is already invoiced (${draft.invoice.number})` };
  if (draft.pending_lines) {
    return { ok: false, code: "PENDING_LINES", error: `${draft.pending_lines} sale(s) of this month are not final yet (returns window or open claim)` };
  }
  if (draft.amount <= 0) return { ok: false, code: "NOTHING_DUE", error: "No commission is due for this month" };
  const seq = await DB.prepare("select count(*) as n from commission_invoices where seller_id = ?1 and period = ?2")
    .bind(sellerId, period).first<{ n: number }>();
  const number = `PH-C-${period}-${String(sellerId).padStart(4, "0")}-${Number(seq?.n || 0) + 1}`;
  const due = new Date(now.getTime() + PAYMENT_DAYS * DAY).toISOString().slice(0, 10);
  const idSql = "(select id from commission_invoices where number = ?1)";
  try {
    // One transaction: the partial unique index refuses a second live
    // invoice for the month, so concurrent requests cannot both succeed.
    await DB.batch([
      DB.prepare(
        "insert into commission_invoices (number, seller_id, period, due_date, note, issued_by, issued_at) values (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
      ).bind(number, sellerId, period, due, note, userId, sqlTime(now)),
      DB.prepare(
        `update commissions set invoice_id = ${idSql}, status = 'invoiced'
         where seller_id = ?2 and period = ?3 and status = 'accrued' and invoice_id is null`
      ).bind(number, sellerId, period),
      DB.prepare(
        `update commission_invoices set amount = (select coalesce(sum(amount), 0) from commissions where invoice_id = commission_invoices.id)
         where number = ?1`
      ).bind(number),
      DB.prepare(
        `insert into commission_events (action, invoice_id, new_amount, actor, note)
         select 'invoice_issued', id, amount, ?2, ?3 from commission_invoices where number = ?1`
      ).bind(number, `admin:${userId}`, note),
    ]);
  } catch (err) {
    if (/UNIQUE/i.test(String((err as Error)?.message || err))) return { ok: false, code: "EXISTS", error: "This month is already invoiced" };
    throw err;
  }
  const row = await DB.prepare("select id, amount from commission_invoices where number = ?1").bind(number).first<{ id: number; amount: number }>();
  return { ok: true, id: Number(row?.id), number, amount: Number(row?.amount || 0) };
}

export async function paidOn(DB: D1Database, invoiceId: number): Promise<number> {
  const row = await DB.prepare("select coalesce(sum(amount), 0) as paid from commission_payments where invoice_id = ?1")
    .bind(invoiceId).first<{ paid: number }>();
  return Number(row?.paid || 0);
}

export async function recordPayment(
  DB: D1Database,
  invoiceId: number,
  input: { amount: number; paid_on: string; method: string; reference: string | null },
  userId: number,
  now = new Date()
): Promise<Result<{ id: number; balance: number; status: string }>> {
  const inv = await DB.prepare("select * from commission_invoices where id = ?1").bind(invoiceId).first<InvoiceRow>();
  if (!inv) return { ok: false, code: "NOT_FOUND", error: "Invoice not found" };
  if (inv.status !== "issued") return { ok: false, code: "NOT_OPEN", error: inv.status === "paid" ? "This invoice is already paid" : "This invoice is cancelled" };
  if (input.paid_on > now.toISOString().slice(0, 10)) return { ok: false, code: "FUTURE_DATE", error: "The transfer date cannot be in the future" };
  if (input.paid_on < inv.issued_at.slice(0, 10)) return { ok: false, code: "BEFORE_INVOICE", error: "The transfer date is before the invoice" };
  const balance = inv.amount - (await paidOn(DB, invoiceId));
  if (input.amount > balance) return { ok: false, code: "OVERPAID", error: `More than the balance (${(balance / 100).toFixed(2)} MAD)` };
  const res = await DB.batch([
    // Guarded insert: refused if, meanwhile, another payment used the balance.
    DB.prepare(
      `insert into commission_payments (invoice_id, amount, paid_on, method, reference, recorded_by)
       select ?1, ?2, ?3, ?4, ?5, ?6 from commission_invoices i
       where i.id = ?1 and i.status = 'issued'
         and (select coalesce(sum(amount), 0) from commission_payments where invoice_id = ?1) + ?2 <= i.amount`
    ).bind(invoiceId, input.amount, input.paid_on, input.method, input.reference, userId),
    DB.prepare(
      `update commission_invoices set status = 'paid', paid_at = datetime('now')
       where id = ?1 and status = 'issued' and (select coalesce(sum(amount), 0) from commission_payments where invoice_id = ?1) >= amount`
    ).bind(invoiceId),
    DB.prepare(
      `update commissions set status = 'paid'
       where invoice_id = ?1 and status = 'invoiced' and (select status from commission_invoices where id = ?1) = 'paid'`
    ).bind(invoiceId),
  ]);
  if (!Number(res?.[0]?.meta?.changes)) return { ok: false, code: "OVERPAID", error: "The balance changed: reload and try again" };
  await DB.prepare(
    "insert into commission_events (action, invoice_id, new_amount, actor, note) values ('payment_recorded', ?1, ?2, ?3, ?4)"
  ).bind(invoiceId, input.amount, `admin:${userId}`, [input.method, input.paid_on, input.reference].filter(Boolean).join(" · ")).run();
  const after = await DB.prepare("select status, amount from commission_invoices where id = ?1").bind(invoiceId).first<{ status: string; amount: number }>();
  return { ok: true, id: invoiceId, balance: Number(after?.amount || 0) - (await paidOn(DB, invoiceId)), status: String(after?.status) };
}

export async function cancelInvoice(DB: D1Database, invoiceId: number, userId: number, note: string): Promise<Result> {
  const inv = await DB.prepare("select * from commission_invoices where id = ?1").bind(invoiceId).first<InvoiceRow>();
  if (!inv) return { ok: false, code: "NOT_FOUND", error: "Invoice not found" };
  if (inv.status !== "issued") return { ok: false, code: "NOT_OPEN", error: "Only an unpaid invoice can be cancelled" };
  if ((await paidOn(DB, invoiceId)) > 0) return { ok: false, code: "HAS_PAYMENTS", error: "This invoice has payments: it cannot be cancelled" };
  const res = await DB.batch([
    DB.prepare(
      `update commission_invoices set status = 'cancelled', cancelled_at = datetime('now'), cancelled_by = ?2
       where id = ?1 and status = 'issued' and not exists (select 1 from commission_payments where invoice_id = ?1)`
    ).bind(invoiceId, userId),
    DB.prepare(
      `update commissions set status = 'accrued', invoice_id = null
       where invoice_id = ?1 and status = 'invoiced' and (select status from commission_invoices where id = ?1) = 'cancelled'`
    ).bind(invoiceId),
  ]);
  if (!Number(res?.[0]?.meta?.changes)) return { ok: false, code: "NOT_OPEN", error: "Only an unpaid invoice can be cancelled" };
  await DB.prepare(
    "insert into commission_events (action, invoice_id, old_amount, actor, note) values ('invoice_cancelled', ?1, ?2, ?3, ?4)"
  ).bind(invoiceId, inv.amount, `admin:${userId}`, note).run();
  return { ok: true, id: invoiceId };
}

// Invoices with what was paid, the balance, and a reconciliation check:
// the invoice amount must equal the sum of the commissions it covers.
export async function listInvoices(DB: D1Database, filter: { sellerId?: number | undefined; status?: string | undefined; period?: string | undefined } = {}) {
  const where: string[] = [];
  const args: unknown[] = [];
  if (filter.sellerId) { args.push(filter.sellerId); where.push(`i.seller_id = ?${args.length}`); }
  if (filter.status) { args.push(filter.status); where.push(`i.status = ?${args.length}`); }
  if (filter.period) { args.push(filter.period); where.push(`i.period = ?${args.length}`); }
  const res = await DB.prepare(
    `select i.*, s.name as seller_name,
            coalesce((select sum(p.amount) from commission_payments p where p.invoice_id = i.id), 0) as paid,
            (select max(p.paid_on) from commission_payments p where p.invoice_id = i.id) as last_paid_on,
            coalesce((select sum(c.amount) from commissions c where c.invoice_id = i.id), 0) as lines_amount,
            (select count(*) from commissions c where c.invoice_id = i.id) as lines
     from commission_invoices i join sellers s on s.id = i.seller_id
     ${where.length ? `where ${where.join(" and ")}` : ""}
     order by i.issued_at desc, i.id desc limit 200`
  ).bind(...args).all<InvoiceRow & { seller_name: string; paid: number; last_paid_on: string | null; lines_amount: number; lines: number }>();
  const today = new Date().toISOString().slice(0, 10);
  return (res.results || []).map((i) => ({
    ...i,
    balance: i.status === "cancelled" ? 0 : Number(i.amount) - Number(i.paid),
    overdue: i.status === "issued" && i.due_date < today,
    // Cancelled invoices give their lines back, so only live ones are checked.
    reconciled: i.status === "cancelled" || Number(i.amount) === Number(i.lines_amount),
  }));
}

export async function invoicePayments(DB: D1Database, invoiceIds: number[]) {
  if (!invoiceIds.length) return [];
  const res = await DB.prepare(
    `select id, invoice_id, amount, paid_on, method, reference, created_at from commission_payments
     where invoice_id in (${invoiceIds.map((_, i) => `?${i + 1}`).join(",")}) order by paid_on, id`
  ).bind(...invoiceIds).all<{ id: number; invoice_id: number; amount: number; paid_on: string; method: string; reference: string | null }>();
  return res.results || [];
}

// Ledger totals: recorded and not invoiced, invoiced, paid, outstanding.
export async function ledgerTotals(DB: D1Database, sellerId?: number) {
  const row = await DB.prepare(
    `select
       coalesce(sum(case when status = 'accrued' then amount else 0 end), 0) as to_invoice,
       coalesce(sum(case when status in ('invoiced','paid') then amount else 0 end), 0) as invoiced
     from commissions ${sellerId ? "where seller_id = ?1" : ""}`
  ).bind(...(sellerId ? [sellerId] : [])).first<{ to_invoice: number; invoiced: number }>();
  const paid = await DB.prepare(
    `select coalesce(sum(p.amount), 0) as paid from commission_payments p join commission_invoices i on i.id = p.invoice_id
     ${sellerId ? "where i.seller_id = ?1" : ""}`
  ).bind(...(sellerId ? [sellerId] : [])).first<{ paid: number }>();
  const invoiced = Number(row?.invoiced || 0);
  const paidTotal = Number(paid?.paid || 0);
  return { to_invoice: Number(row?.to_invoice || 0), invoiced, paid: paidTotal, outstanding: invoiced - paidTotal };
}
