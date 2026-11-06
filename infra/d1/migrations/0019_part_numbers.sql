-- ============================================================
-- Part numbers (OEM and aftermarket references).
--
-- part_numbers          one row per reference: "7701 208 174" as written,
--                       number_norm "7701208174" for search (A–Z, 0–9 only),
--                       kind oem (car maker's original number) or
--                       aftermarket (parts maker's number, brand_id = maker).
--                       OEM numbers have no brand (the car maker is implied).
-- part_listing_numbers  a seller's listing ↔ number: role own (the part
--                       carries this number) or replaces (it replaces this
--                       original number — the seller's claim).
-- part_number_links     two numbers that are the same part: equivalent, or
--                       supersedes (the maker replaced an old number).
--                       Seller claims create unverified links; search and
--                       "other offers" use a link only once an admin
--                       verified it (verification admin_approved/verified).
-- Data source / verification as in migrations/0018.
-- ============================================================

CREATE TABLE IF NOT EXISTS part_numbers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  number       TEXT NOT NULL,
  number_norm  TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('oem','aftermarket')),
  brand_id     INTEGER REFERENCES brands(id),
  source       TEXT,
  verification TEXT NOT NULL DEFAULT 'unverified',
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_part_numbers_norm_brand ON part_numbers(number_norm, coalesce(brand_id, 0));

CREATE TABLE IF NOT EXISTS part_listing_numbers (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id         INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  part_number_id  INTEGER NOT NULL REFERENCES part_numbers(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('own','replaces')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (part_id, part_number_id)
);
CREATE INDEX IF NOT EXISTS idx_part_listing_numbers_number ON part_listing_numbers(part_number_id);

CREATE TABLE IF NOT EXISTS part_number_links (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id       INTEGER NOT NULL REFERENCES part_numbers(id) ON DELETE CASCADE,
  to_id         INTEGER NOT NULL REFERENCES part_numbers(id) ON DELETE CASCADE,
  relation      TEXT NOT NULL CHECK (relation IN ('equivalent','supersedes')),
  source        TEXT,
  verification  TEXT NOT NULL DEFAULT 'unverified' CHECK (verification IN ('unverified','admin_approved','verified','rejected')),
  created_by    INTEGER REFERENCES users(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at    TEXT,
  UNIQUE (from_id, to_id, relation)
);
CREATE INDEX IF NOT EXISTS idx_part_number_links_to ON part_number_links(to_id);
CREATE INDEX IF NOT EXISTS idx_part_number_links_verification ON part_number_links(verification);
