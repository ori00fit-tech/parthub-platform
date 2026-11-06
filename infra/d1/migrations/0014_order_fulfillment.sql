-- ============================================================
-- Sellers fulfil their own part of an order.
-- An order can hold parts from several sellers, so each order line has
-- its own status (pending → confirmed → shipped → delivered, or
-- cancelled). orders.status is derived from its lines: the least
-- advanced line that is not cancelled (cancelled when all are).
-- delivered_at starts the 7-day returns window.
-- order_events records each change (who, what, when).
-- ============================================================

ALTER TABLE order_items ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE order_items ADD COLUMN status_updated_at TEXT;
ALTER TABLE order_items ADD COLUMN delivered_at TEXT;
ALTER TABLE orders ADD COLUMN delivered_at TEXT;

-- Existing orders: lines take the order's status.
UPDATE order_items
SET status = (SELECT o.status FROM orders o WHERE o.id = order_items.order_id),
    status_updated_at = (SELECT o.updated_at FROM orders o WHERE o.id = order_items.order_id);
UPDATE order_items
SET delivered_at = status_updated_at
WHERE status = 'delivered';
UPDATE orders SET delivered_at = updated_at WHERE status = 'delivered';

CREATE INDEX IF NOT EXISTS idx_order_items_seller_status ON order_items(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at);
