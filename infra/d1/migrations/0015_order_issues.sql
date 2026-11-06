-- ============================================================
-- Returns and complaints ("problem with this part").
-- A buyer reports a problem on a delivered order line within 7 days.
--   open      → waiting for the seller (reply within 2 working days)
--   accepted  → the seller takes the part back / refunds
--   refused   → the seller disagrees (the buyer can ask PartHub)
--   escalated → PartHub reviews the case
--   closed    → outcome: buyer (refunded), seller (claim rejected) or withdrawn
-- return_paid_by follows the returns policy: the party responsible pays.
-- Each step is also written to order_events ("issue_*").
-- ============================================================

CREATE TABLE IF NOT EXISTS order_issues (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id    INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  buyer_id         INTEGER NOT NULL REFERENCES users(id),
  seller_id        INTEGER NOT NULL REFERENCES sellers(id),
  reason           TEXT NOT NULL,
  details          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','accepted','refused','escalated','closed')),
  outcome          TEXT CHECK (outcome IN ('buyer','seller','withdrawn')),
  return_paid_by   TEXT CHECK (return_paid_by IN ('seller','buyer')),
  seller_note      TEXT,
  admin_note       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  seller_replied_at TEXT,
  escalated_at     TEXT,
  closed_at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_issues_item ON order_issues(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_seller_status ON order_issues(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_order_issues_status ON order_issues(status, created_at);
