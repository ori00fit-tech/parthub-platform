-- Why an admin rejected or archived a part; shown to the seller. One ALTER per
-- file so the migrations workflow can skip it when the column already exists.
ALTER TABLE parts ADD COLUMN moderation_note TEXT;
