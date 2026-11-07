-- ============================================================
-- Commission rules (see workers/api/src/utils/commissions.ts).
--   commission_rates: dated rate history. The rate of a sale is the one in
--   force on the day its returns window ends (delivered_at + 7 days),
--   whenever the ledger is computed. A higher rate needs 30 days notice
--   (effective_from >= the day it is scheduled + 30). Rows are never
--   edited; a rate not in force yet can be cancelled (cancelled_at).
--   commission_events: audit trail of rate changes and ledger adjustments.
--   order_issues.refund_amount: partial refund, in centimes (NULL = the
--   whole line). The commission is charged on what the buyer kept.
-- Safe to run again: IF NOT EXISTS / INSERT OR IGNORE; the ADD COLUMN is
-- applied on its own by d1-apply-add-columns.sh.
-- ============================================================

ALTER TABLE order_issues ADD COLUMN refund_amount INTEGER;

CREATE TABLE IF NOT EXISTS commission_rates (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  rate_bps       INTEGER NOT NULL CHECK (rate_bps >= 0 AND rate_bps <= 2000),
  effective_from TEXT NOT NULL,                       -- 'YYYY-MM-DD HH:MM:SS' UTC
  note           TEXT,
  created_by     INTEGER REFERENCES users(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_at   TEXT,
  cancelled_by   INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_commission_rates_from ON commission_rates(effective_from);
-- Selling has always been free: the base row covers every past sale.
INSERT OR IGNORE INTO commission_rates (id, rate_bps, effective_from, note)
VALUES (1, 0, '2000-01-01 00:00:00', 'Selling is free');

CREATE TABLE IF NOT EXISTS commission_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  action        TEXT NOT NULL,       -- rate_scheduled | rate_cancelled | waived | refund_adjusted
  commission_id INTEGER REFERENCES commissions(id),
  rate_id       INTEGER REFERENCES commission_rates(id),
  old_amount    INTEGER,
  new_amount    INTEGER,
  actor         TEXT NOT NULL,       -- admin:<user id> | seller:<seller id> | system
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commission_events_commission ON commission_events(commission_id);
