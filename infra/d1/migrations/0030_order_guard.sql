-- ============================================================
-- Duplicate and fake orders (see workers/api/src/utils/order-guard.ts).
--   orders.idempotency_key: one key per checkout attempt, sent by the
--   site; the same key twice returns the first order (a double tap, a
--   retry on a bad connection) instead of a second one.
--   orders.cart_hash: what was ordered and the phone; the same cart again
--   within minutes returns the first order too (old clients, two tabs).
-- Safe to run again: the ADD COLUMNs are applied one by one by
-- d1-apply-add-columns.sh; IF NOT EXISTS on the indexes.
-- ============================================================

ALTER TABLE orders ADD COLUMN idempotency_key TEXT;
ALTER TABLE orders ADD COLUMN cart_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_buyer_idempotency ON orders(buyer_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_buyer_created ON orders(buyer_id, created_at);
