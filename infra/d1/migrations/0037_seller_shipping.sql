-- ============================================================
-- A seller's shipping choices (see workers/api/src/utils/shipping.ts and
-- utils/carriers.ts, seller portal › Store › Shipping):
--   sellers.free_delivery_over: delivery free when the buyer's parts from
--   this store reach this amount (centimes; NULL = never).
--   sellers.delivery_days_local / _national: days to deliver in the
--   seller's city / elsewhere, shown to buyers (NULL = not said).
--   seller_carriers: the delivery companies the seller works with, their
--   customer number there, and the one used by default.
-- Safe to run again: ADD COLUMNs one by one, IF NOT EXISTS.
-- ============================================================

ALTER TABLE sellers ADD COLUMN free_delivery_over INTEGER;
ALTER TABLE sellers ADD COLUMN delivery_days_local INTEGER;
ALTER TABLE sellers ADD COLUMN delivery_days_national INTEGER;

CREATE TABLE IF NOT EXISTS seller_carriers (
  seller_id   INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  carrier     TEXT NOT NULL REFERENCES carriers(code),
  account_ref TEXT,                         -- the seller's customer number at the carrier
  is_default  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (seller_id, carrier)
);
