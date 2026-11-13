-- ============================================================
-- Admin audit log (see workers/api/src/utils/audit.ts): every change made
-- from the admin (POST / PUT / PATCH / DELETE under /api/v1/admin) with
-- who, what, on which record, the request (secrets removed), the result
-- and when. Read in Admin › Activity log. Rows are never edited.
-- Safe to run again: IF NOT EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id     INTEGER NOT NULL REFERENCES users(id),
  method       TEXT NOT NULL,                 -- POST | PUT | PATCH | DELETE
  route        TEXT NOT NULL,                 -- the route pattern, e.g. /api/v1/admin/sellers/:id/status
  path         TEXT NOT NULL,                 -- the path called, e.g. /api/v1/admin/sellers/12/status
  target_type  TEXT,                          -- sellers, parts, orders, issues, ...
  target_id    TEXT,
  body         TEXT,                          -- request body, secrets removed, at most 2,000 characters
  status       INTEGER NOT NULL,              -- HTTP status of the answer
  ip           TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_id, created_at);
