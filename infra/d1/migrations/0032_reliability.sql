-- ============================================================
-- Reliability (v0.1.1 audit):
--   uq_orders_buyer_cart_pending: one pending order per buyer and cart
--   (same parts, quantities, phone): two simultaneous checkouts with
--   different keys end with one order (utils/order-guard.ts).
--   whatsapp_notifications.payload / attempts: what to send, kept so a
--   message skipped (template not approved yet) or failed is retried
--   (utils/wa-notify.ts, cron every 15 minutes).
--   shipment_events.applied_at: an event recorded but not applied (error
--   half-way) is applied when the carrier sends it again.
-- Safe to run again: ADD COLUMNs one by one (d1-apply-add-columns.sh),
-- IF NOT EXISTS on indexes; the UPDATE only clears duplicate hashes so
-- the unique index can be created.
-- ============================================================

ALTER TABLE whatsapp_notifications ADD COLUMN payload TEXT;
ALTER TABLE whatsapp_notifications ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shipment_events ADD COLUMN applied_at TEXT;

UPDATE orders SET cart_hash = NULL
WHERE status = 'pending' AND cart_hash IS NOT NULL
  AND id NOT IN (SELECT MIN(id) FROM orders WHERE status = 'pending' AND cart_hash IS NOT NULL GROUP BY buyer_id, cart_hash);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_buyer_cart_pending ON orders(buyer_id, cart_hash) WHERE status = 'pending' AND cart_hash IS NOT NULL;
-- Events recorded before this migration were applied with them.
UPDATE shipment_events SET applied_at = created_at WHERE applied_at IS NULL AND shipment_id IS NOT NULL AND created_at < '2026-11-14 00:00:00';
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_retry ON whatsapp_notifications(status, created_at);
