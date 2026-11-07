-- ============================================================
-- PartHub Platform — D1 Schema
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  phone          TEXT,
  role           TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('buyer','seller','admin')),
  avatar_url     TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1,
  token_version  INTEGER NOT NULL DEFAULT 0,  -- sessions (see migrations/0021)
  terms_accepted_at TEXT,                   -- terms of use (see migrations/0013)
  terms_version  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Sellers ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sellers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  logo_url    TEXT,
  banner_url  TEXT,
  phone       TEXT,
  whatsapp    TEXT,
  location    TEXT,
  seller_type TEXT DEFAULT 'shop',          -- shop | breaker | importer (see migrations/0007)
  moderation_note TEXT,                     -- why rejected/suspended (see migrations/0011)
  agreement_accepted_at TEXT,               -- seller agreement (see migrations/0013)
  agreement_version TEXT,
  delivery_enabled INTEGER NOT NULL DEFAULT 1, -- fulfilment methods (see migrations/0020)
  pickup_enabled INTEGER NOT NULL DEFAULT 0,
  pickup_address TEXT,
  pickup_hours TEXT,
  delivery_fee_local INTEGER,     -- centimes, NULL = platform fee (see migrations/0022)
  delivery_fee_national INTEGER,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','rejected')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Vehicle Makes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_makes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  slug      TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  logo_url  TEXT,
  source      TEXT,                       -- see migrations/0018
  verification TEXT NOT NULL DEFAULT 'unverified'
);

-- ── Vehicle Models ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_models (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  make_id  INTEGER NOT NULL REFERENCES vehicle_makes(id) ON DELETE CASCADE,
  slug     TEXT NOT NULL,
  name     TEXT NOT NULL,
  source      TEXT,                       -- see migrations/0018
  verification TEXT NOT NULL DEFAULT 'unverified',
  UNIQUE (make_id, slug)
);

-- ── Vehicle Years ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_years (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id  INTEGER NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  year      INTEGER NOT NULL,
  UNIQUE (model_id, year)
);

-- ── Brands ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS brands (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  slug      TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  logo_url  TEXT,
  source      TEXT,                       -- see migrations/0018
  verification TEXT NOT NULL DEFAULT 'unverified'
);

-- ── Categories ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id   INTEGER REFERENCES categories(id),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  icon        TEXT,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── Parts ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id      INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  category_id    INTEGER NOT NULL REFERENCES categories(id),
  brand_id       INTEGER REFERENCES brands(id),
  slug           TEXT NOT NULL UNIQUE,
  title          TEXT NOT NULL,
  description    TEXT,
  sku            TEXT,
  price          INTEGER NOT NULL,            -- cents
  compare_price  INTEGER,                     -- cents
  condition      TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new','used','refurbished')),
  quantity       INTEGER NOT NULL DEFAULT 1,
  weight_kg      REAL,
  part_origin    TEXT DEFAULT 'aftermarket',  -- oem | aftermarket | used (see migrations/0008)
  moderation_note TEXT,                      -- why rejected/archived (see migrations/0010)
  delivery_available INTEGER NOT NULL DEFAULT 1, -- 0 = pickup only (see migrations/0020)
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','pending','active','rejected','archived')),
  featured       INTEGER NOT NULL DEFAULT 0,
  view_count     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Part Images ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS part_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id     INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Part Specs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS part_specs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id     INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  value       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ── Part Compatibility ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS part_compatibility (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id     INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  make        TEXT NOT NULL,
  model       TEXT NOT NULL,
  year_start  INTEGER NOT NULL,
  year_end    INTEGER,
  engine      TEXT,
  trim        TEXT,
  notes       TEXT,
  generation_id INTEGER REFERENCES vehicle_generations(id), -- catalog links (see migrations/0016)
  engine_id   INTEGER REFERENCES vehicle_engines(id),
  engine_scope TEXT NOT NULL DEFAULT 'unspecified' -- specific | all | unspecified (see migrations/0018)
);

-- ── Orders ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  reference        TEXT UNIQUE,
  buyer_id         INTEGER NOT NULL REFERENCES users(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
  payment_status   TEXT NOT NULL DEFAULT 'unpaid'
                   CHECK (payment_status IN ('unpaid','paid','refunded','failed')),
  shipping_status  TEXT NOT NULL DEFAULT 'pending'
                   CHECK (shipping_status IN ('pending','packed','shipped','delivered','returned')),
  subtotal         INTEGER NOT NULL DEFAULT 0,
  shipping_fee     INTEGER NOT NULL DEFAULT 0,
  discount         INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  delivered_at     TEXT,                     -- all lines delivered (see migrations/0014)
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Order Items ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  part_id    INTEGER NOT NULL REFERENCES parts(id),
  seller_id  INTEGER NOT NULL REFERENCES sellers(id),
  title      TEXT NOT NULL,
  sku        TEXT,
  price      INTEGER NOT NULL,
  quantity   INTEGER NOT NULL DEFAULT 1,
  subtotal   INTEGER NOT NULL,
  thumbnail  TEXT,
  status     TEXT NOT NULL DEFAULT 'pending',  -- per-seller fulfilment (see migrations/0014)
  status_updated_at TEXT,
  delivered_at TEXT,
  fulfillment TEXT NOT NULL DEFAULT 'delivery', -- delivery | pickup | courier (see migrations/0020)
  pickup_code TEXT,
  pickup_until TEXT,
  pickup_attempts INTEGER NOT NULL DEFAULT 0,
  collector_name TEXT,
  collector_phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Order Addresses ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_addresses (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id       INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL,
  address_line1  TEXT NOT NULL,
  address_line2  TEXT,
  city           TEXT NOT NULL,
  state          TEXT,
  postal_code    TEXT,
  country        TEXT NOT NULL DEFAULT 'US'
);

-- ── Order Events ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event       TEXT NOT NULL,
  note        TEXT,
  created_by  TEXT NOT NULL DEFAULT 'system',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Reviews ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id              INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  buyer_id             INTEGER NOT NULL REFERENCES users(id),
  order_item_id        INTEGER REFERENCES order_items(id),
  rating               INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body                 TEXT,
  is_verified_purchase INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (part_id, buyer_id)
);

-- ── Review Images ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id  INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url        TEXT NOT NULL
);

-- ── Part Requests ("Request a part") ─────────────────────────
-- See migrations/0003_part_requests.sql
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
  images             TEXT NOT NULL DEFAULT '[]',  -- JSON array, see migrations/0005
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

-- ── WhatsApp Notification Log ───────────────────────────────
-- See migrations/0004_whatsapp_notifications.sql
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL,     -- new_request | new_offer | offer_accepted
  ref_id      INTEGER NOT NULL,  -- part_requests.id or request_offers.id
  recipient   TEXT NOT NULL,     -- 'seller:<id>' or 'buyer:<id>'
  sent        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (kind, ref_id, recipient)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_recipient
  ON whatsapp_notifications(recipient, created_at);

-- ── Core indexes (see migrations/0006_core_indexes.sql) ─────
CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_status  ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_slug    ON sellers(slug);
CREATE INDEX IF NOT EXISTS idx_parts_seller_id   ON parts(seller_id);
CREATE INDEX IF NOT EXISTS idx_parts_category_id ON parts(category_id);
CREATE INDEX IF NOT EXISTS idx_parts_status       ON parts(status);
CREATE INDEX IF NOT EXISTS idx_parts_slug         ON parts(slug);
CREATE INDEX IF NOT EXISTS idx_parts_featured     ON parts(featured);
CREATE INDEX IF NOT EXISTS idx_parts_price        ON parts(price);
CREATE INDEX IF NOT EXISTS idx_parts_created_at   ON parts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compat_part_id ON part_compatibility(part_id);
CREATE INDEX IF NOT EXISTS idx_compat_make    ON part_compatibility(make);
CREATE INDEX IF NOT EXISTS idx_compat_model   ON part_compatibility(model);
CREATE INDEX IF NOT EXISTS idx_compat_year    ON part_compatibility(year_start, year_end);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_ref      ON orders(reference);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id  ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_part_id   ON order_items(part_id);
CREATE INDEX IF NOT EXISTS idx_reviews_part_id   ON reviews(part_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer_id  ON reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status    ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_models_make_id ON vehicle_models(make_id);
CREATE INDEX IF NOT EXISTS idx_years_model_id ON vehicle_years(model_id);
CREATE INDEX IF NOT EXISTS idx_part_images_part ON part_images(part_id, is_featured DESC, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_part_specs_part ON part_specs(part_id);
CREATE INDEX IF NOT EXISTS idx_order_addresses_order ON order_addresses(order_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_makes_slug ON vehicle_makes(slug);

-- ── Morocco layer indexes (see migrations/0009_morocco_layer_backfill.sql) ──
CREATE INDEX IF NOT EXISTS idx_parts_part_origin ON parts(part_origin);
CREATE INDEX IF NOT EXISTS idx_sellers_seller_type ON sellers(seller_type);

CREATE TABLE IF NOT EXISTS stock_alerts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id      INTEGER NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'notified')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  notified_at  TEXT,
  UNIQUE (part_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_alerts_part_status ON stock_alerts(part_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_alerts_user ON stock_alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_status ON order_items(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id, created_at);

-- ── Returns and complaints (see migrations/0015) ───────────────
CREATE TABLE IF NOT EXISTS order_issues (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id    INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  buyer_id         INTEGER NOT NULL REFERENCES users(id),
  seller_id        INTEGER NOT NULL REFERENCES sellers(id),
  reason           TEXT NOT NULL,
  details          TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','accepted','refused','escalated','closed')),
  outcome          TEXT CHECK (outcome IN ('buyer','seller','withdrawn')),
  return_paid_by   TEXT CHECK (return_paid_by IN ('seller','buyer')),
  seller_note      TEXT,
  admin_note       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  seller_replied_at TEXT,
  escalated_at     TEXT,
  closed_at        TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_issues_item ON order_issues(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_seller_status ON order_issues(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_order_issues_status ON order_issues(status, created_at);

-- ── Vehicle catalog (see migrations/0016) ─────────────────────
CREATE TABLE IF NOT EXISTS vehicle_generations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  model_id    INTEGER NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,
  name        TEXT NOT NULL,            -- "Clio IV"
  year_start  INTEGER NOT NULL,
  year_end    INTEGER,                  -- NULL = still sold
  sort_order  INTEGER NOT NULL DEFAULT 0,
  source      TEXT,                       -- see migrations/0018
  verification TEXT NOT NULL DEFAULT 'unverified',
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
  source      TEXT,                       -- see migrations/0018
  verification TEXT NOT NULL DEFAULT 'unverified',
  specs_inferred INTEGER NOT NULL DEFAULT 1,
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
CREATE INDEX IF NOT EXISTS idx_part_compat_generation ON part_compatibility(generation_id);
CREATE INDEX IF NOT EXISTS idx_part_compat_engine ON part_compatibility(engine_id);
CREATE INDEX IF NOT EXISTS idx_catalog_suggestions_kind_status ON catalog_suggestions(kind, status);

-- ── Part numbers (see migrations/0019) ────────────────────────
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

-- ── Sign-in attempts (see migrations/0021) ────────────────────
CREATE TABLE IF NOT EXISTS auth_attempts (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL,
  blocked_until TEXT
);

-- ── Shipments: one per seller and order (see migrations/0022) ──
CREATE TABLE IF NOT EXISTS order_shipments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id       INTEGER NOT NULL REFERENCES sellers(id),
  method          TEXT NOT NULL DEFAULT 'delivery',
  fee             INTEGER NOT NULL DEFAULT 0,
  carrier         TEXT,
  tracking_number TEXT,
  shipped_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (order_id, seller_id)
);
CREATE INDEX IF NOT EXISTS idx_order_shipments_seller ON order_shipments(seller_id);

-- ── Commission ledger (see migrations/0023) ───────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by INTEGER REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO platform_settings (key, value) VALUES ('commission_rate_bps', '0');

CREATE TABLE IF NOT EXISTS commissions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  order_id      INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id     INTEGER NOT NULL REFERENCES sellers(id),
  base          INTEGER NOT NULL,                 -- line subtotal, centimes (delivery fee excluded)
  rate_bps      INTEGER NOT NULL,
  amount        INTEGER NOT NULL,                 -- commission, centimes
  status        TEXT NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued','waived','invoiced','paid')),
  period        TEXT NOT NULL,                    -- YYYY-MM of the delivery
  delivered_at  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commissions_seller_period ON commissions(seller_id, period);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(period);
