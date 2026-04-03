-- ============================================================
-- PartHub Platform — Search Engine v1
-- ============================================================

PRAGMA foreign_keys = ON;

-- Search analytics
CREATE TABLE IF NOT EXISTS part_search_logs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  query           TEXT NOT NULL DEFAULT '',
  make            TEXT,
  model           TEXT,
  year            INTEGER,
  category_slug   TEXT,
  brand_slug      TEXT,
  results_count   INTEGER NOT NULL DEFAULT 0,
  selected_part_id INTEGER,
  session_id      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_search_logs_query        ON part_search_logs(query);
CREATE INDEX IF NOT EXISTS idx_search_logs_vehicle      ON part_search_logs(make, model, year);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at   ON part_search_logs(created_at DESC);

-- Compatibility performance
CREATE INDEX IF NOT EXISTS idx_compat_make_model_year
  ON part_compatibility(make, model, year_start, year_end);

CREATE INDEX IF NOT EXISTS idx_compat_make_model_part
  ON part_compatibility(make, model, part_id);
