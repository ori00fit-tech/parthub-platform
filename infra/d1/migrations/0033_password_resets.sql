-- ============================================================
-- Forgot password (see workers/api/src/utils/password-reset.ts).
--   A 6-digit code sent on WhatsApp to the account's own number, or a
--   one-time link an admin creates for someone who cannot get the code.
--   Only hashes are stored; a reset lives 15 minutes (code) or 60 (link),
--   allows 5 wrong codes, and is used once.
-- Safe to run again: IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS password_resets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL CHECK (channel IN ('whatsapp', 'admin_link')),
  secret_hash TEXT NOT NULL,              -- SHA-256 of the code or link token (with JWT_SECRET)
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_by  INTEGER REFERENCES users(id), -- the admin, for a link
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_secret ON password_resets(secret_hash);
