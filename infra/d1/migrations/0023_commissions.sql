-- ============================================================
-- Marketplace commission ledger (see workers/api/src/utils/commissions.ts).
--   platform_settings: commission_rate_bps (basis points: 500 = 5%),
--   0 while selling is free (seller agreement: 30 days notice before any
--   commission).
--   commissions: one row per delivered order line once the returns window
--   is over with no open claim. The rate is copied at that moment, so a
--   later change never applies to past sales. A claim resolved for the
--   buyer makes the row "waived" (no commission).
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('commission_rate_bps', '0');

CREATE TABLE IF NOT EXISTS commissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id     INTEGER NOT NULL REFERENCES sellers(id),
  base          INTEGER NOT NULL,                 -- line subtotal, centimes (delivery fee excluded)
  rate_bps      INTEGER NOT NULL,
  amount        INTEGER NOT NULL,                 -- commission, centimes
  status        TEXT NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued','waived','invoiced','paid')),
  period        TEXT NOT NULL,                    -- YYYY-MM of the delivery
  delivered_at  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commissions_seller_period ON commissions(seller_id, period);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(period);
