-- ============================================================
-- Carrier integration layer (see workers/api/src/utils/carriers.ts and
-- infra/docs/carriers.md).
--   carriers: every delivery company PartHub knows, configured from the
--   admin panel (no code change to add one): public tracking link, and how
--   to read its webhooks (field_map: where the tracking number / status /
--   COD amount / time are in its JSON; status_map: its status words ->
--   PartHub statuses). Webhook secrets are Worker secrets
--   (CARRIER_<CODE>_WEBHOOK_SECRET), never stored here.
--   shipment_events: the timeline of a shipment (seller, carrier webhook,
--   admin), deduplicated.
--   order_shipments.status...: the latest normalized status, delivery and
--   COD collected as reported by the carrier.
-- Safe to run again: IF NOT EXISTS / INSERT OR IGNORE; the ADD COLUMNs
-- are applied one by one by d1-apply-add-columns.sh.
-- ============================================================

ALTER TABLE order_shipments ADD COLUMN status TEXT;              -- created | picked_up | in_transit | out_for_delivery | delivered | failed_attempt | returning | returned | cancelled
ALTER TABLE order_shipments ADD COLUMN status_at TEXT;
ALTER TABLE order_shipments ADD COLUMN carrier_delivered_at TEXT; -- delivery reported by the carrier (proof)
ALTER TABLE order_shipments ADD COLUMN cod_collected INTEGER;    -- centimes the carrier says it collected
ALTER TABLE order_shipments ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;

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
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_order_shipments_tracking ON order_shipments(carrier, tracking_number);
