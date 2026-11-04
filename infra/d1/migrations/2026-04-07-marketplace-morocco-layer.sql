-- SUPERSEDED by 0007_seller_type.sql, 0008_part_origin.sql and
-- 0009_morocco_layer_backfill.sql (run by the "D1 migrations" workflow).
-- Kept for history; do not run on a database that already has these columns.

-- Add seller type
ALTER TABLE sellers ADD COLUMN seller_type TEXT DEFAULT 'shop';

-- Add part origin
ALTER TABLE parts ADD COLUMN part_origin TEXT DEFAULT 'aftermarket';

-- Optional normalization updates for existing rows
UPDATE sellers
SET seller_type = 'shop'
WHERE seller_type IS NULL OR trim(seller_type) = '';

UPDATE parts
SET part_origin = 'aftermarket'
WHERE part_origin IS NULL OR trim(part_origin) = '';

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_parts_part_origin ON parts(part_origin);
CREATE INDEX IF NOT EXISTS idx_sellers_seller_type ON sellers(seller_type);
