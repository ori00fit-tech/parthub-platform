# Revenue: metrics and commission ledger

Migrations `0023_commissions.sql` (ledger) and `0024_commission_rules.sql`
(dated rates, audit log, partial refunds); rules in
`workers/api/src/utils/commissions.ts`.

## Today
- Selling is free: `commission_rates` has one row, 0% since 2000-01-01.
  The seller agreement promises at least 30 days notice before any
  commission.
- Admin › **Revenue**: per month, delivered sales (GMV, by delivery month),
  delivered orders, cancelled lines, returns resolved for the buyer, the
  commission recorded, and a simulation "at X%". Per-seller figures for
  the chosen month. Rates are scheduled there (0–20%).
- Seller portal › **Statement**: each delivered sale of the month, "returns
  window open" until 7 days after delivery, then final (commission) or
  "returned: no commission". Any scheduled rate change is shown at the top
  as soon as it is scheduled.

## Rules
- **Rate of a sale = the rate in force on the day its 7-day returns window
  ends** (`delivered_at + 7 days`), whenever the line is recorded. Recording
  late (nobody opened a page, a claim stayed open) or changing the rate
  later gives the same result. Recorded rows are never recomputed.
- **Rates are dated and never edited** (`commission_rates`). A new rate
  cannot start in the past. A rate higher than the one that would apply
  on its start date must start at least **30 days** after the day it is
  scheduled (API refuses otherwise, `NOTICE_REQUIRED`). Lowering can start
  at once. A rate not in force yet can be cancelled; one in force cannot.
- **Base = what the buyer kept**: line subtotal minus the refunds of claims
  closed for the buyer. "Refund done" takes an optional amount in MAD
  (`order_issues.refund_amount`; empty = whole line). Nothing kept →
  `waived`. The delivery fee is never included.
- Claim closed for the seller or withdrawn → normal commission. Any claim
  not closed (open, accepted, refused, escalated) holds the line.
- One row per order line (`commissions.order_item_id UNIQUE`, `INSERT OR
  IGNORE`): concurrent passes cannot record twice. Amounts are integers
  (centimes), rounded half up.
- Admin can waive one recorded commission (reason required, only while
  `accrued`): `POST /api/v1/admin/commissions/:id/waive`.
- **Audit trail**: `commission_events` keeps every rate scheduled /
  cancelled and every waiver, with who did it and the reason.
- Recording runs every day at 03:17 UTC (Worker cron, `src/index.ts`), and
  also when the revenue page or a statement is opened (a statement only
  records that seller's lines).

## API
- `GET /api/v1/admin/revenue?month=YYYY-MM` → figures + `rate_bps`,
  `upcoming`, `rates` (history), `notice_days`.
- `POST /api/v1/admin/commission-rates` `{ rate_percent, effective_from:
  YYYY-MM-DD, note? }`; `DELETE /api/v1/admin/commission-rates/:id`.
- `GET /api/v1/marketplace/me/statement?month=YYYY-MM` → lines + `upcoming`.

## Before charging anything
1. Decide the rate and how sellers pay (monthly invoice + bank transfer
   is the realistic start while sellers collect cash on delivery).
2. Update the seller agreement (`packages/shared/src/legal/content.js`,
   bump `LEGAL_VERSION`), tell sellers, and schedule the rate at least 30
   days ahead (the statement shows it to every seller).
3. **Invoices / payments — not built yet**: the ledger has `invoiced` and
   `paid` statuses but no `invoices` / `payments` tables (amount due,
   paid, balance, transfer date). Build these before the first non-zero
   rate starts.
4. Sellers decide when a line is "delivered" (cash on delivery). With a
   non-zero rate, plan a buyer confirmation or carrier tracking so lines
   cannot stay "shipped" forever.
