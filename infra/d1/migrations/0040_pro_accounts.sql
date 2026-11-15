-- 0040: professional accounts (mechanics, garages) and a pro price per part.
-- A buyer asks for a pro account; PartHub checks and approves it. An
-- approved pro sees and pays parts.pro_price where the seller set one
-- (utils/pro.ts). Everyone else sees only "pro price available".
ALTER TABLE parts ADD COLUMN pro_price INTEGER;              -- centimes, below price; NULL = none

CREATE TABLE IF NOT EXISTS pro_accounts (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,                               -- garage / workshop name
  city          TEXT NOT NULL,
  ice           TEXT,                                        -- company id (ICE), optional
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note          TEXT,                                        -- why rejected (shown to the buyer)
  requested_at  TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at   TEXT,
  reviewed_by   INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_pro_accounts_status ON pro_accounts(status, requested_at);
