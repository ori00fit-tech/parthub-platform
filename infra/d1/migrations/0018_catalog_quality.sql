-- ============================================================
-- Catalog data quality.
--
-- 1. Engine scope of a fitment row. A row without an engine does NOT mean
--    "fits every engine":
--      specific    → only the engine named on the row (engine / engine_id)
--      all         → the seller confirmed it fits every engine
--      unspecified → the engine was not given (older rows, free text)
-- 2. Where each catalog row comes from and whether it was checked:
--      source       seed | seed_parthub | admin | seller_suggestion | imported
--      verification unverified | admin_approved | verified
--    vehicle_engines.specs_inferred = 1 when fuel / cc / hp were read from
--    the engine name ("1.5 dCi 90") and not confirmed from a source.
-- 3. Indexes on the fitment → catalog links; "Continental Tyres" merged
--    into "Continental" (same maker).
-- Safe to run again (ADD COLUMN steps are applied one by one by the
-- workflow; the rest only touches rows not yet set).
-- ============================================================

ALTER TABLE part_compatibility ADD COLUMN engine_scope TEXT NOT NULL DEFAULT 'unspecified';

ALTER TABLE vehicle_makes ADD COLUMN source TEXT;
ALTER TABLE vehicle_makes ADD COLUMN verification TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE vehicle_models ADD COLUMN source TEXT;
ALTER TABLE vehicle_models ADD COLUMN verification TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE vehicle_generations ADD COLUMN source TEXT;
ALTER TABLE vehicle_generations ADD COLUMN verification TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE vehicle_engines ADD COLUMN source TEXT;
ALTER TABLE vehicle_engines ADD COLUMN verification TEXT NOT NULL DEFAULT 'unverified';
ALTER TABLE vehicle_engines ADD COLUMN specs_inferred INTEGER NOT NULL DEFAULT 1;
ALTER TABLE brands ADD COLUMN source TEXT;
ALTER TABLE brands ADD COLUMN verification TEXT NOT NULL DEFAULT 'unverified';

-- Rows that already name an engine are engine-specific.
UPDATE part_compatibility
SET engine_scope = 'specific'
WHERE engine_scope = 'unspecified' AND trim(coalesce(engine, '')) <> '';

-- Existing catalog rows: seed data (UK list + PartHub Morocco list), not verified.
UPDATE vehicle_makes SET source = 'seed' WHERE source IS NULL;
UPDATE vehicle_models SET source = 'seed' WHERE source IS NULL;
UPDATE brands SET source = 'seed' WHERE source IS NULL;
UPDATE vehicle_generations SET source = 'seed_parthub' WHERE source IS NULL;
UPDATE vehicle_engines SET source = 'seed_parthub' WHERE source IS NULL;

-- One "Continental" brand.
UPDATE parts
SET brand_id = (SELECT id FROM brands WHERE slug = 'continental')
WHERE brand_id = (SELECT id FROM brands WHERE slug = 'continental-tyres')
  AND EXISTS (SELECT 1 FROM brands WHERE slug = 'continental');
DELETE FROM brands
WHERE slug = 'continental-tyres'
  AND EXISTS (SELECT 1 FROM brands WHERE slug = 'continental')
  AND NOT EXISTS (SELECT 1 FROM parts WHERE parts.brand_id = brands.id);

CREATE INDEX IF NOT EXISTS idx_part_compat_generation ON part_compatibility(generation_id);
CREATE INDEX IF NOT EXISTS idx_part_compat_engine ON part_compatibility(engine_id);
CREATE INDEX IF NOT EXISTS idx_catalog_suggestions_kind_status ON catalog_suggestions(kind, status);
