-- ============================================================
-- Part requests ("Request a part")
-- A buyer describes a part they can't find; matching sellers
-- (shops, dismantlers / casses) reply with offers; the buyer
-- accepts one and gets the seller's contact details.
-- ============================================================

CREATE TABLE IF NOT EXISTS part_requests (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  reference          TEXT NOT NULL UNIQUE,
  buyer_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  make               TEXT NOT NULL,
  model              TEXT NOT NULL,
  year               INTEGER,
  engine             TEXT,
  vin                TEXT,
  category_id        INTEGER REFERENCES categories(id),
  part_name          TEXT NOT NULL,
  oem_number         TEXT,
  description        TEXT,
  image_url          TEXT,
  condition_pref     TEXT NOT NULL DEFAULT 'any' CHECK (condition_pref IN ('any','new','used')),
  city               TEXT NOT NULL,
  phone              TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','closed')),
  accepted_offer_id  INTEGER,
  expires_at         TEXT NOT NULL,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS request_offers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id       INTEGER NOT NULL REFERENCES part_requests(id) ON DELETE CASCADE,
  seller_id        INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  price            INTEGER NOT NULL CHECK (price > 0),          -- cents
  condition        TEXT NOT NULL CHECK (condition IN ('new','used','refurbished')),
  warranty_months  INTEGER NOT NULL DEFAULT 0 CHECK (warranty_months BETWEEN 0 AND 36),
  delivery_days    INTEGER CHECK (delivery_days IS NULL OR delivery_days BETWEEN 0 AND 60),
  note             TEXT,
  image_url        TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (request_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_part_requests_buyer ON part_requests(buyer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_part_requests_open ON part_requests(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_part_requests_make ON part_requests(make);
CREATE INDEX IF NOT EXISTS idx_request_offers_request ON request_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_request_offers_seller ON request_offers(seller_id);
