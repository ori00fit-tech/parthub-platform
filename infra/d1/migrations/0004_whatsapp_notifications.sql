-- ============================================================
-- WhatsApp notification log
-- One row per message we attempted. Used to avoid sending the same
-- notification twice and to cap how many alerts a seller gets per day.
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL,     -- new_request | new_offer | offer_accepted
  ref_id      INTEGER NOT NULL,  -- part_requests.id or request_offers.id
  recipient   TEXT NOT NULL,     -- 'seller:<id>' or 'buyer:<id>'
  sent        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (kind, ref_id, recipient)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_recipient
  ON whatsapp_notifications(recipient, created_at);
