# Revenue: metrics and commission ledger

Migration `0023_commissions.sql`, rules in `workers/api/src/utils/commissions.ts`.

## Today
- Selling is free (`platform_settings.commission_rate_bps = 0`). The seller
  agreement promises at least 30 days notice before any commission.
- Admin › **Revenue**: per month, delivered sales (GMV, by delivery month),
  delivered orders, cancelled lines, returns resolved for the buyer, the
  commission recorded, and a simulation "at X%". Per-seller figures for
  the chosen month. The rate is set there (0–20%).
- Seller portal › **Statement**: each delivered sale of the month, "returns
  window open" until 7 days after delivery, then final (commission) or
  "returned: no commission".

## Rules
- A delivered line is recorded once, after the 7-day returns window, if it
  has no unresolved claim. The rate in force at that moment is copied:
  changing the rate never changes past sales.
- Claim closed for the buyer → `waived` (0). Closed for the seller or
  withdrawn → normal commission.
- Base = the part's price × quantity; the delivery fee is never included.
- Recording runs when the revenue page or a statement is opened
  (idempotent, at most 500 lines per pass); no cron needed.

## Before charging anything
1. Decide the rate and how sellers pay (monthly invoice + bank transfer
   is the realistic start while sellers collect cash on delivery).
2. Update the seller agreement (`packages/shared/src/legal/content.js`,
   bump `LEGAL_VERSION`), tell sellers, wait 30 days, then set the rate.
3. Invoices / payments: statuses `invoiced` and `paid` exist in the ledger;
   the screens to issue and mark them are the next step.
