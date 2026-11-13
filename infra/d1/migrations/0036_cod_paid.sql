-- ============================================================
-- Cash on delivery: an order delivered is paid (the seller or the carrier
-- collected the cash). refreshOrderStatus (utils/fulfillment.ts) now sets
-- payment_status; this marks the orders delivered before it.
-- Safe to run again: only delivered orders still 'unpaid'.
-- ============================================================

UPDATE orders SET payment_status = 'paid', updated_at = datetime('now')
WHERE status = 'delivered' AND payment_status = 'unpaid';
