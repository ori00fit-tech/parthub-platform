-- ============================================================
-- How a buyer gets the parts (see workers/api/src/utils/pickup.ts):
--   delivery: the seller ships to the buyer's address (as before);
--   pickup:   the buyer collects at the store: the seller reserves the
--             part, the buyer inspects it and pays there, and gives a
--             6-digit code that closes the line;
--   courier:  someone the buyer sends collects it, with the same code.
-- Sellers choose what they offer; a part can be "pickup only" (engines,
-- gearboxes, body panels).
-- ============================================================

ALTER TABLE sellers ADD COLUMN delivery_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sellers ADD COLUMN pickup_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sellers ADD COLUMN pickup_address TEXT;
ALTER TABLE sellers ADD COLUMN pickup_hours TEXT;
ALTER TABLE parts ADD COLUMN delivery_available INTEGER NOT NULL DEFAULT 1;
ALTER TABLE order_items ADD COLUMN fulfillment TEXT NOT NULL DEFAULT 'delivery';
ALTER TABLE order_items ADD COLUMN pickup_code TEXT;
ALTER TABLE order_items ADD COLUMN pickup_until TEXT;
ALTER TABLE order_items ADD COLUMN pickup_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN collector_name TEXT;
ALTER TABLE order_items ADD COLUMN collector_phone TEXT;
