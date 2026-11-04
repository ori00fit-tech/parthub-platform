-- Morocco layer, part 3/3: defaults for existing rows and indexes. Safe to re-run.
UPDATE sellers SET seller_type = 'shop' WHERE seller_type IS NULL OR trim(seller_type) = '';
UPDATE parts SET part_origin = 'aftermarket' WHERE part_origin IS NULL OR trim(part_origin) = '';
CREATE INDEX IF NOT EXISTS idx_parts_part_origin ON parts(part_origin);
CREATE INDEX IF NOT EXISTS idx_sellers_seller_type ON sellers(seller_type);
