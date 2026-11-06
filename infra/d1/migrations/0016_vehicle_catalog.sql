-- ============================================================
-- PartHub's own vehicle catalog (Morocco first): generations and engines
-- under the existing makes and models, catalog links on fitment rows, and
-- sellers' suggestions for missing entries (approved by an admin).
-- Data: 0017_seed_vehicle_catalog.sql (built from catalog/vehicles-morocco.txt).
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicle_generations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id    INTEGER NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,            -- "Clio IV"
  year_start  INTEGER NOT NULL,
  year_end    INTEGER,                  -- NULL = still sold
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (model_id, slug)
);

CREATE TABLE IF NOT EXISTS vehicle_engines (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  generation_id   INTEGER NOT NULL REFERENCES vehicle_generations(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,        -- "1.5 dCi 90"
  fuel            TEXT CHECK (fuel IN ('petrol','diesel','hybrid','electric','lpg')),
  displacement_cc INTEGER,
  power_hp        INTEGER,
  code            TEXT,                 -- maker's engine code, e.g. K9K (optional)
  UNIQUE (generation_id, slug)
);

-- What a seller asked to add (make, model, generation, engine or part brand).
CREATE TABLE IF NOT EXISTS catalog_suggestions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  seller_id   INTEGER REFERENCES sellers(id),
  kind        TEXT NOT NULL CHECK (kind IN ('vehicle','brand')),
  make        TEXT,
  model       TEXT,
  generation  TEXT,
  year_start  INTEGER,
  year_end    INTEGER,
  engine      TEXT,
  brand       TEXT,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_vehicle_generations_model ON vehicle_generations(model_id, year_start);
CREATE INDEX IF NOT EXISTS idx_vehicle_engines_generation ON vehicle_engines(generation_id);
CREATE INDEX IF NOT EXISTS idx_catalog_suggestions_status ON catalog_suggestions(status, created_at);

-- Fitment rows keep make/model/years/engine as text (search and "fits my
-- car" use them); these link the row to the catalog when it was picked there.
ALTER TABLE part_compatibility ADD COLUMN generation_id INTEGER REFERENCES vehicle_generations(id);
ALTER TABLE part_compatibility ADD COLUMN engine_id INTEGER REFERENCES vehicle_engines(id);
