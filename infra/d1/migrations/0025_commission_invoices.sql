-- ============================================================
-- Commission invoices and payments (see workers/api/src/utils/invoices.ts).
--   commission_invoices: one per seller and month (a cancelled one can be
--   replaced). Its amount is the sum of the commissions it covers
--   (commissions.invoice_id), fixed when it is issued.
--   commission_payments: bank transfers (or other) recorded against an
--   invoice: amount, transfer date, reference. Balance = amount - paid.
--   Fully paid → invoice "paid" and its commissions "paid".
--   commission_events.invoice_id: invoices issued / cancelled, payments.
--   order_items.received_by_buyer_at: the buyer confirmed receipt (a
--   shipped line becomes delivered without waiting for the seller).
-- Safe to run again: IF NOT EXISTS; the ADD COLUMN is applied on its own by
-- d1-apply-add-columns.sh.
-- ============================================================

ALTER TABLE commissions ADD COLUMN invoice_id INTEGER;            -- commission_invoices.id
ALTER TABLE order_items ADD COLUMN received_by_buyer_at TEXT;   -- the buyer confirmed receipt
ALTER TABLE commission_events ADD COLUMN invoice_id INTEGER;     -- commission_invoices.id

CREATE TABLE IF NOT EXISTS commission_invoices (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  number       TEXT NOT NULL UNIQUE,                 -- PH-C-2026-11-0001
  seller_id    INTEGER NOT NULL REFERENCES sellers(id),
  period       TEXT NOT NULL,                        -- YYYY-MM (delivery month)
  amount       INTEGER NOT NULL DEFAULT 0,           -- centimes
  status       TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','paid','cancelled')),
  due_date     TEXT NOT NULL,                        -- YYYY-MM-DD
  note         TEXT,
  issued_by    INTEGER REFERENCES users(id),
  issued_at    TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at      TEXT,
  cancelled_at TEXT,
  cancelled_by INTEGER REFERENCES users(id)
);
-- At most one live invoice per seller and month.
CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_invoices_live
  ON commission_invoices(seller_id, period) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_commission_invoices_status ON commission_invoices(status, due_date);

CREATE TABLE IF NOT EXISTS commission_payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id  INTEGER NOT NULL REFERENCES commission_invoices(id),
  amount      INTEGER NOT NULL CHECK (amount > 0),  -- centimes
  paid_on     TEXT NOT NULL,                        -- transfer date, YYYY-MM-DD
  method      TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (method IN ('bank_transfer','cash','cheque','other')),
  reference   TEXT,                                 -- bank reference
  recorded_by INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commission_payments_invoice ON commission_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_commissions_invoice ON commissions(invoice_id);
