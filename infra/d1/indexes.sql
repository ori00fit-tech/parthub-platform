-- ============================================================
-- PartHub Platform — D1 Indexes
-- Run after schema.sql
-- ============================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);

-- Sellers
CREATE INDEX IF NOT EXISTS idx_sellers_user_id ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_status  ON sellers(status);
CREATE INDEX IF NOT EXISTS idx_sellers_slug    ON sellers(slug);

-- Parts
CREATE INDEX IF NOT EXISTS idx_parts_seller_id   ON parts(seller_id);
CREATE INDEX IF NOT EXISTS idx_parts_category_id ON parts(category_id);
CREATE INDEX IF NOT EXISTS idx_parts_status       ON parts(status);
CREATE INDEX IF NOT EXISTS idx_parts_slug         ON parts(slug);
CREATE INDEX IF NOT EXISTS idx_parts_featured     ON parts(featured);
CREATE INDEX IF NOT EXISTS idx_parts_price        ON parts(price);
CREATE INDEX IF NOT EXISTS idx_parts_created_at   ON parts(created_at DESC);

-- Part Compatibility
CREATE INDEX IF NOT EXISTS idx_compat_part_id ON part_compatibility(part_id);
CREATE INDEX IF NOT EXISTS idx_compat_make    ON part_compatibility(make);
CREATE INDEX IF NOT EXISTS idx_compat_model   ON part_compatibility(model);
CREATE INDEX IF NOT EXISTS idx_compat_year    ON part_compatibility(year_start, year_end);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_ref      ON orders(reference);

-- Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id  ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_part_id   ON order_items(part_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_part_id   ON reviews(part_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer_id  ON reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status    ON reviews(status);

-- Vehicles
CREATE INDEX IF NOT EXISTS idx_models_make_id ON vehicle_models(make_id);
CREATE INDEX IF NOT EXISTS idx_years_model_id ON vehicle_years(model_id);
