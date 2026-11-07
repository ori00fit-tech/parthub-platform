-- ============================================================
-- Session security (see workers/api/src/middlewares/auth.ts):
--   users.token_version: every session token carries it; signing out
--   (or an admin forcing it) increments it, so older tokens stop working.
--   Each request also re-reads the account: a deactivated user or a
--   changed role takes effect at once, not when the token expires.
-- auth_attempts: failed sign-ins and new accounts per email / IP over a
--   short window, to slow down password guessing and sign-up spam
--   (workers/api/src/utils/rate-limit.ts).
-- ============================================================

ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS auth_attempts (
  key          TEXT PRIMARY KEY,          -- "login:email:...", "login:ip:...", "register:ip:..."
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL,
  blocked_until TEXT
);
