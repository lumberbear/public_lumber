-- Newspaper template fields.
-- meta: per-entry JSONB blob (currently stores kicker/byline/datelineLocation for newspaper).
-- caption: per-photo text caption (rendered in newspaper template; ignored elsewhere).
-- Both are additive, idempotent, and safe to re-run.

ALTER TABLE adventure_entries
  ADD COLUMN IF NOT EXISTS meta JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE adventure_photos
  ADD COLUMN IF NOT EXISTS caption TEXT;
