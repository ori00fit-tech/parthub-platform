-- ============================================================
-- Account deletion with 30 days to change one's mind (see
-- workers/api/src/utils/account-deletion.ts).
--   users.deletion_requested_at: the request; signing in again cancels it.
--   users.deleted_at: personal data erased (after 30 days).
--   account_deletions: every request, cancelled or carried out (history,
--   and the store's status to give back if the seller comes back).
-- Safe to run again: ADD COLUMNs one by one, IF NOT EXISTS.
-- ============================================================

ALTER TABLE users ADD COLUMN deletion_requested_at TEXT;
ALTER TABLE users ADD COLUMN deleted_at TEXT;

CREATE TABLE IF NOT EXISTS account_deletions (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id              INTEGER NOT NULL REFERENCES users(id),
  requested_at         TEXT NOT NULL DEFAULT (datetime('now')),
  reason               TEXT,
  seller_status_before TEXT,               -- the store's status, given back on cancel
  cancelled_at         TEXT,
  completed_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_account_deletions_user ON account_deletions(user_id, requested_at);
CREATE INDEX IF NOT EXISTS idx_users_deletion ON users(deletion_requested_at) WHERE deletion_requested_at IS NOT NULL;
