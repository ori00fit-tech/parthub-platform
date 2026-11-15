-- 0039: "Verified seller" — set by PartHub after a real check (trade
-- register / ICE, a visit to the shop). The storefront shows the badge only
-- when verified_at is set. verification_note says what was checked (admin only).
ALTER TABLE sellers ADD COLUMN verified_at TEXT;
ALTER TABLE sellers ADD COLUMN verified_by INTEGER;
ALTER TABLE sellers ADD COLUMN verification_note TEXT;
