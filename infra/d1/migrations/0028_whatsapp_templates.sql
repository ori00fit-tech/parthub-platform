-- ============================================================
-- WhatsApp templates in three languages (see
-- workers/api/src/utils/wa-templates.ts and infra/docs/whatsapp-templates.md).
--   users.locale: the language the person uses PartHub in (ar | fr | en),
--   sent by the sites with each signed-in request; WhatsApp messages go out
--   in that language when Meta approved it.
--   whatsapp_notifications.template / language: which template and which
--   language were sent (or why nothing was sent: status 'skipped').
--   whatsapp_templates: Meta's review status of each template and language,
--   read from Meta (Admin › WhatsApp › Templates) or set by hand.
-- Safe to run again: IF NOT EXISTS; the ADD COLUMNs are applied one by one
-- by d1-apply-add-columns.sh.
-- ============================================================

ALTER TABLE users ADD COLUMN locale TEXT;                          -- ar | fr | en, NULL = not known yet
ALTER TABLE whatsapp_notifications ADD COLUMN template TEXT;
ALTER TABLE whatsapp_notifications ADD COLUMN language TEXT;

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  name        TEXT NOT NULL,                   -- Meta template name
  language    TEXT NOT NULL,                   -- ar | fr | en
  status      TEXT NOT NULL DEFAULT 'draft',   -- draft | pending | approved | rejected | paused | disabled
  category    TEXT,                            -- as Meta classified it (UTILITY / MARKETING / ...)
  reason      TEXT,                            -- Meta's rejection reason, or the last submit error
  meta_id     TEXT,
  source      TEXT NOT NULL DEFAULT 'meta',    -- meta (read from Meta) | manual (set in the admin)
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (name, language)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_notifications_template ON whatsapp_notifications(template, created_at);
