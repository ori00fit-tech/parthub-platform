-- Why an admin rejected or suspended a store; shown to the seller.
ALTER TABLE sellers ADD COLUMN moderation_note TEXT;
