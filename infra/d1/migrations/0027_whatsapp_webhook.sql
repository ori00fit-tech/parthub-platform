-- ============================================================
-- WhatsApp webhook (see workers/api/src/utils/whatsapp.ts and
-- infra/docs/whatsapp.md).
--   whatsapp_notifications: the WhatsApp message id of each template sent,
--   and its delivery status from Meta (sent, delivered, read, failed).
--   whatsapp_contacts: per number, the last message they sent (opens the
--   24-hour window for free replies) and opt-out ("STOP").
--   whatsapp_messages: the conversation: messages received and replies
--   sent from the admin inbox.
-- Safe to run again: IF NOT EXISTS; the ADD COLUMNs are applied one by one
-- by d1-apply-add-columns.sh.
-- ============================================================

ALTER TABLE whatsapp_notifications ADD COLUMN wa_message_id TEXT;
ALTER TABLE whatsapp_notifications ADD COLUMN status TEXT;        -- sent | delivered | read | failed
ALTER TABLE whatsapp_notifications ADD COLUMN status_at TEXT;
ALTER TABLE whatsapp_notifications ADD COLUMN error TEXT;
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_wamid ON whatsapp_notifications(wa_message_id);

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  phone           TEXT PRIMARY KEY,                 -- international digits, e.g. 212612345678
  name            TEXT,                             -- WhatsApp profile name
  last_inbound_at TEXT,                             -- their last message (24-hour window)
  opted_out_at    TEXT,                             -- replied STOP: no more notifications
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_message_id TEXT UNIQUE,
  direction     TEXT NOT NULL CHECK (direction IN ('in','out')),
  phone         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'text',       -- text | image | document | audio | location | button | ...
  body          TEXT,
  status        TEXT,                               -- out: sent | delivered | read | failed
  error         TEXT,
  sent_by       INTEGER REFERENCES users(id),       -- admin who replied
  handled_at    TEXT,                               -- in: marked handled in the inbox
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone, created_at);
