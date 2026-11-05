-- ============================================================
-- "Notify me when back in stock"
-- A buyer subscribes to an out-of-stock part. When a seller restocks it,
-- active alerts become 'notified' (shown in the buyer's account) and a
-- WhatsApp message is sent when WhatsApp is configured.
-- One row per (part, buyer); subscribing again after a notification
-- replaces the old row.
-- ============================================================

CREATE TABLE IF NOT EXISTS stock_alerts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id      INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'notified')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  notified_at  TEXT,
  UNIQUE (part_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_part_status ON stock_alerts(part_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_user ON stock_alerts(user_id, created_at DESC);
