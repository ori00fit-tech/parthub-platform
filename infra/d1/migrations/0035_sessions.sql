-- ============================================================
-- Devices (see workers/api/src/utils/sessions.ts). Every sign-in is a
-- session: the person sees their devices and can sign one out.
--   Sites: the access token (7 days) carries the session id.
--   Apps: a short access token (15 minutes) and a refresh token (60 days)
--   that changes at every use; using an old one again (stolen copy) ends
--   the session. Only hashes are stored.
-- Safe to run again: IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS sessions (
  id                 TEXT PRIMARY KEY,               -- random, in the token (sid)
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client             TEXT NOT NULL CHECK (client IN ('web', 'app')),
  device_name        TEXT,                           -- "Chrome on Android", or what the app says
  platform           TEXT,                           -- web | android | ios | other
  token_version      INTEGER NOT NULL DEFAULT 0,     -- users.token_version when signed in
  refresh_hash       TEXT,                           -- apps only
  prev_refresh_hash  TEXT,                           -- the one before: reuse = theft
  ip                 TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at       TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at         TEXT NOT NULL,
  revoked_at         TEXT,
  revoked_reason     TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked_at);
