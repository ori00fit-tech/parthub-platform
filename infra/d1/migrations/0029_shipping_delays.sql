-- ============================================================
-- Late shipments (see workers/api/src/utils/shipping-delays.ts).
--   order_shipments.delay_notified_at: when the daily check told the buyer
--   and the seller that a shipped parcel has had no update for several
--   days (once per shipment; cleared by the next update).
-- Safe to run again: the ADD COLUMN is applied by d1-apply-add-columns.sh.
-- ============================================================

ALTER TABLE order_shipments ADD COLUMN delay_notified_at TEXT;
