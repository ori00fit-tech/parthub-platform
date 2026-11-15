-- 0041: favorites — parts a buyer saved to come back to, kept on the
-- account (every device). Gone when the part or the account is deleted.
CREATE TABLE IF NOT EXISTS favorites (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  part_id    INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, part_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_part ON favorites(part_id);
