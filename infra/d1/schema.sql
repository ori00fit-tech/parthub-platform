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
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended','rejected')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Vehicle Makes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_makes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  slug      TEXT NOT NULL UNIQUE,
  name      TEXT NOT NULL,
  logo_url  TEXT
);

-- ── Vehicle Models ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_models (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  make_id  INTEGER NOT NULL REFERENCES vehicle_makes(id) ON DELETE CASCADE,
  slug     TEXT NOT NULL,
  name     TEXT NOT NULL,
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
  logo_url  TEXT
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
  notes       TEXT
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
