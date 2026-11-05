-- ============================================================
-- Acceptance of PartHub's legal documents.
-- users:   terms of use (sent when an account is created).
-- sellers: seller agreement (required to create a store; sellers who
--          opened their store earlier accept it from the seller portal).
-- *_version holds the version of the text that was accepted.
-- ============================================================

ALTER TABLE users ADD COLUMN terms_accepted_at TEXT;
ALTER TABLE users ADD COLUMN terms_version TEXT;
ALTER TABLE sellers ADD COLUMN agreement_accepted_at TEXT;
ALTER TABLE sellers ADD COLUMN agreement_version TEXT;
