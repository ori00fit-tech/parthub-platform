-- 0042: questions about an order, between the buyer and each seller of
-- that order (one conversation per order and seller). PartHub can read
-- them (disputes). read_at: when the other side opened the conversation.
CREATE TABLE IF NOT EXISTS order_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id  INTEGER NOT NULL REFERENCES sellers(id),
  sender     TEXT NOT NULL CHECK (sender IN ('buyer', 'seller', 'admin')),
  sender_id  INTEGER REFERENCES users(id),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_order_messages_thread ON order_messages(order_id, seller_id, id);
CREATE INDEX IF NOT EXISTS idx_order_messages_unread ON order_messages(seller_id, sender, read_at);
