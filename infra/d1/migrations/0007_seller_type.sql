-- Morocco layer, part 1/3 (was in 2026-04-07-marketplace-morocco-layer.sql,
-- which was never applied in production). One ALTER per file so the
-- migrations workflow can skip it when the column already exists.
ALTER TABLE sellers ADD COLUMN seller_type TEXT DEFAULT 'shop';
