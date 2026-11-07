-- ============================================================
-- Delivery fees per seller, and one shipment per seller and order
-- (see workers/api/src/utils/shipping.ts).
--   sellers.delivery_fee_local / delivery_fee_national: what the seller
--   charges in their own city / elsewhere, in centimes (NULL = the
--   platform's flat fee, SHIPPING_FEE_CENTIMES).
--   order_shipments: per seller of an order: method (delivery / pickup /
--   courier), the fee that seller collects, and the carrier and tracking
--   number entered when shipping. orders.shipping_fee is the sum of the
--   fees of sellers with lines still open.
-- ============================================================

ALTER TABLE sellers ADD COLUMN delivery_fee_local INTEGER;
ALTER TABLE sellers ADD COLUMN delivery_fee_national INTEGER;

CREATE TABLE IF NOT EXISTS order_shipments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id       INTEGER NOT NULL REFERENCES sellers(id),
  method          TEXT NOT NULL DEFAULT 'delivery',   -- delivery | pickup | courier
  fee             INTEGER NOT NULL DEFAULT 0,         -- centimes, collected by the seller
  carrier         TEXT,                               -- amana | ctm | sendit | forcelog | olivraison | own | other
  tracking_number TEXT,
  shipped_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (order_id, seller_id)
);
CREATE INDEX IF NOT EXISTS idx_order_shipments_seller ON order_shipments(seller_id);
