-- ============================================================
-- PartHub Platform — D1 Schema
-- ============================================================

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
  locale         TEXT,                      -- ar | fr | en (see migrations/0028)
  deletion_requested_at TEXT,               -- account deletion asked (migrations/0034)
  deleted_at     TEXT,                      -- personal data erased
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
  idempotency_key  TEXT,                     -- one per checkout attempt (migrations/0030)
  cart_hash        TEXT,                     -- what was ordered + phone (migrations/0030)
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
  received_by_buyer_at TEXT,                     -- the buyer confirmed receipt (migrations/0025)
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
  kind        TEXT NOT NULL,     -- new_request | new_offer | offer_accepted | back_in_stock | new_order
  ref_id      INTEGER NOT NULL,  -- part_requests.id, request_offers.id, stock_alerts.id or orders.id
  recipient   TEXT NOT NULL,     -- 'seller:<id>' or 'buyer:<id>'
  sent        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  wa_message_id TEXT,            -- WhatsApp's id (migrations/0027)
  status      TEXT,              -- sent | delivered | read | failed (webhook)
  status_at   TEXT,
  error       TEXT,
  template    TEXT,              -- template and language sent (migrations/0028)
  language    TEXT,
  payload     TEXT,              -- what to send, for retries (migrations/0032)
  attempts    INTEGER NOT NULL DEFAULT 0,
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
  refund_amount    INTEGER,          -- partial refund, centimes; NULL = whole line (migrations/0024)
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
  status          TEXT,                               -- normalized carrier status (migrations/0026)
  status_at       TEXT,
  carrier_delivered_at TEXT,
  cod_collected   INTEGER,
  attempts        INTEGER NOT NULL DEFAULT 0,
  delay_notified_at TEXT,                             -- late-shipment notice sent (migrations/0029)
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
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  invoice_id    INTEGER                            -- commission_invoices.id (migrations/0025)
);
CREATE INDEX IF NOT EXISTS idx_commissions_seller_period ON commissions(seller_id, period);
CREATE INDEX IF NOT EXISTS idx_commissions_period ON commissions(period);

-- ── Commission rules (migrations/0024) ────────────────────────
CREATE TABLE IF NOT EXISTS commission_rates (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  rate_bps       INTEGER NOT NULL CHECK (rate_bps >= 0 AND rate_bps <= 2000),
  effective_from TEXT NOT NULL,                       -- 'YYYY-MM-DD HH:MM:SS' UTC
  note           TEXT,
  created_by     INTEGER REFERENCES users(id),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  cancelled_at   TEXT,
  cancelled_by   INTEGER REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_commission_rates_from ON commission_rates(effective_from);
-- Selling has always been free: the base row covers every past sale.
INSERT OR IGNORE INTO commission_rates (id, rate_bps, effective_from, note)
VALUES (1, 0, '2000-01-01 00:00:00', 'Selling is free');

CREATE TABLE IF NOT EXISTS commission_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  action        TEXT NOT NULL,       -- rate_scheduled | rate_cancelled | waived | refund_adjusted
  commission_id INTEGER REFERENCES commissions(id),
  rate_id       INTEGER REFERENCES commission_rates(id),
  old_amount    INTEGER,
  new_amount    INTEGER,
  actor         TEXT NOT NULL,       -- admin:<user id> | seller:<seller id> | system
  note          TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  invoice_id    INTEGER                            -- commission_invoices.id (migrations/0025)
);
CREATE INDEX IF NOT EXISTS idx_commission_events_commission ON commission_events(commission_id);

-- ── Commission invoices and payments (migrations/0025) ─────────
CREATE TABLE IF NOT EXISTS commission_invoices (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  number       TEXT NOT NULL UNIQUE,                 -- PH-C-2026-11-0001
  seller_id    INTEGER NOT NULL REFERENCES sellers(id),
  period       TEXT NOT NULL,                        -- YYYY-MM (delivery month)
  amount       INTEGER NOT NULL DEFAULT 0,           -- centimes
  status       TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','paid','cancelled')),
  due_date     TEXT NOT NULL,                        -- YYYY-MM-DD
  note         TEXT,
  issued_by    INTEGER REFERENCES users(id),
  issued_at    TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at      TEXT,
  cancelled_at TEXT,
  cancelled_by INTEGER REFERENCES users(id)
);
-- At most one live invoice per seller and month.
CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_invoices_live
  ON commission_invoices(seller_id, period) WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_commission_invoices_status ON commission_invoices(status, due_date);

CREATE TABLE IF NOT EXISTS commission_payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id  INTEGER NOT NULL REFERENCES commission_invoices(id),
  amount      INTEGER NOT NULL CHECK (amount > 0),  -- centimes
  paid_on     TEXT NOT NULL,                        -- transfer date, YYYY-MM-DD
  method      TEXT NOT NULL DEFAULT 'bank_transfer' CHECK (method IN ('bank_transfer','cash','cheque','other')),
  reference   TEXT,                                 -- bank reference
  recorded_by INTEGER REFERENCES users(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commission_payments_invoice ON commission_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_commissions_invoice ON commissions(invoice_id);

-- ── Search analytics (migrations/0002) ────────────────────────
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

-- ── Carriers (migrations/0026) ────────────────────────────────
CREATE TABLE IF NOT EXISTS carriers (
  code                  TEXT PRIMARY KEY,          -- amana, sendit... (used in order_shipments.carrier)
  name                  TEXT NOT NULL,
  kind                  TEXT NOT NULL DEFAULT 'courier' CHECK (kind IN ('courier','postal','own','other')),
  active                INTEGER NOT NULL DEFAULT 1,
  sort_order            INTEGER NOT NULL DEFAULT 100,
  tracking_url_template TEXT,                      -- e.g. https://example.ma/track?n={tracking}
  webhook_enabled       INTEGER NOT NULL DEFAULT 0,
  field_map             TEXT,                      -- JSON, see utils/carriers.ts
  status_map            TEXT,                      -- JSON { "their status": "delivered", ... }
  api_client            TEXT NOT NULL DEFAULT 'manual', -- outbound integration (manual until a client exists)
  notes                 TEXT,
  updated_by            INTEGER REFERENCES users(id),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Delivery companies active in Morocco. Tracking links and webhooks are
-- configured by an admin once the carrier gives them (nothing guessed here).
INSERT OR IGNORE INTO carriers (code, name, kind, sort_order) VALUES
  ('amana', 'Amana (Barid Al-Maghrib)', 'postal', 10),
  ('ctm', 'CTM Messagerie', 'courier', 20),
  ('sendit', 'Sendit', 'courier', 30),
  ('forcelog', 'Forcelog', 'courier', 40),
  ('olivraison', 'Olivraison', 'courier', 50),
  ('ozonexpress', 'Ozon Express', 'courier', 60),
  ('cathedis', 'Cathedis', 'courier', 70),
  ('chronopost', 'Chronopost Maroc', 'courier', 80),
  ('dhl', 'DHL Express', 'courier', 90),
  ('aramex', 'Aramex', 'courier', 100),
  ('own', 'Own driver', 'own', 900),
  ('other', 'Other', 'other', 999);

CREATE TABLE IF NOT EXISTS shipment_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id     INTEGER REFERENCES order_shipments(id) ON DELETE CASCADE,
  carrier         TEXT NOT NULL,
  tracking_number TEXT,
  status          TEXT NOT NULL,                   -- normalized (see order_shipments.status)
  carrier_status  TEXT,                            -- as the carrier wrote it
  note            TEXT,
  cod_amount      INTEGER,                         -- centimes
  occurred_at     TEXT NOT NULL,
  source          TEXT NOT NULL,                   -- seller | carrier | admin
  dedupe_key      TEXT NOT NULL UNIQUE,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  applied_at      TEXT                             -- its effects done (migrations/0032)
);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_order_shipments_tracking ON order_shipments(carrier, tracking_number);

-- ── WhatsApp webhook (migrations/0027) ────────────────────────
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_wamid ON whatsapp_notifications(wa_message_id);

CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  phone           TEXT PRIMARY KEY,                 -- international digits, e.g. 212612345678
  name            TEXT,                             -- WhatsApp profile name
  last_inbound_at TEXT,                             -- their last message (24-hour window)
  opted_out_at    TEXT,                             -- replied STOP: no more notifications
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_message_id TEXT UNIQUE,
  direction     TEXT NOT NULL CHECK (direction IN ('in','out')),
  phone         TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'text',       -- text | image | document | audio | location | button | ...
  body          TEXT,
  status        TEXT,                               -- out: sent | delivered | read | failed
  error         TEXT,
  sent_by       INTEGER REFERENCES users(id),       -- admin who replied
  handled_at    TEXT,                               -- in: marked handled in the inbox
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(phone, created_at);

-- See migrations/0028_whatsapp_templates.sql
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  name        TEXT NOT NULL,
  language    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  category    TEXT,
  reason      TEXT,
  meta_id     TEXT,
  source      TEXT NOT NULL DEFAULT 'meta',
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (name, language)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_template ON whatsapp_notifications(template, created_at);

-- See migrations/0030_order_guard.sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_buyer_idempotency ON orders(buyer_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_buyer_created ON orders(buyer_id, created_at);

-- See migrations/0031_admin_audit_log.sql
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id     INTEGER NOT NULL REFERENCES users(id),
  method       TEXT NOT NULL,                 -- POST | PUT | PATCH | DELETE
  route        TEXT NOT NULL,                 -- the route pattern, e.g. /api/v1/admin/sellers/:id/status
  path         TEXT NOT NULL,                 -- the path called, e.g. /api/v1/admin/sellers/12/status
  target_type  TEXT,                          -- sellers, parts, orders, issues, ...
  target_id    TEXT,
  body         TEXT,                          -- request body, secrets removed, at most 2,000 characters
  status       INTEGER NOT NULL,              -- HTTP status of the answer
  ip           TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON admin_audit_log(admin_id, created_at);

-- See migrations/0032_reliability.sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_buyer_cart_pending ON orders(buyer_id, cart_hash) WHERE status = 'pending' AND cart_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_retry ON whatsapp_notifications(status, created_at);

-- See migrations/0033_password_resets.sql
CREATE TABLE IF NOT EXISTS password_resets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL CHECK (channel IN ('whatsapp', 'admin_link')),
  secret_hash TEXT NOT NULL,              -- SHA-256 of the code or link token (with JWT_SECRET)
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT NOT NULL,
  used_at     TEXT,
  created_by  INTEGER REFERENCES users(id), -- the admin, for a link
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_secret ON password_resets(secret_hash);

-- See migrations/0034_account_deletion.sql
CREATE TABLE IF NOT EXISTS account_deletions (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id              INTEGER NOT NULL REFERENCES users(id),
  requested_at         TEXT NOT NULL DEFAULT (datetime('now')),
  reason               TEXT,
  seller_status_before TEXT,               -- the store's status, given back on cancel
  cancelled_at         TEXT,
  completed_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_account_deletions_user ON account_deletions(user_id, requested_at);
CREATE INDEX IF NOT EXISTS idx_users_deletion ON users(deletion_requested_at) WHERE deletion_requested_at IS NOT NULL;

-- See migrations/0035_sessions.sql
CREATE TABLE IF NOT EXISTS sessions (
  id                 TEXT PRIMARY KEY,               -- random, in the token (sid)
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client             TEXT NOT NULL CHECK (client IN ('web', 'app')),
  device_name        TEXT,                           -- "Chrome on Android", or what the app says
  platform           TEXT,                           -- web | android | ios | other
  token_version      INTEGER NOT NULL DEFAULT 0,     -- users.token_version when signed in
  refresh_hash       TEXT,                           -- apps only
  prev_refresh_hash  TEXT,                           -- the one before: reuse = theft
  ip                 TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at       TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at         TEXT NOT NULL,
  revoked_at         TEXT,
  revoked_reason     TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked_at);
