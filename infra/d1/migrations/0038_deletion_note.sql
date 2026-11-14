-- ============================================================
-- Account deletion: the store's moderation note before the request, given
-- back if the seller cancels (it used to be lost). See
-- workers/api/src/utils/account-deletion.ts.
-- Safe to run again: the ADD COLUMN is applied by d1-apply-add-columns.sh.
-- ============================================================

ALTER TABLE account_deletions ADD COLUMN seller_note_before TEXT;
