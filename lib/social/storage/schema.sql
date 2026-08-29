-- Vedam Content Studio — calendar storage.
--
-- Applied automatically on first use (see postgres-store.ts), and safe to run
-- by hand: every statement is idempotent.
--
--   psql "$DATABASE_URL" -f lib/social/storage/schema.sql

CREATE TABLE IF NOT EXISTS calendar_months (
  -- "2026-09". Also the natural key the app already uses everywhere.
  id          TEXT PRIMARY KEY CHECK (id ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  year        INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  month       INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),

  -- The month theme and per-platform notes. Small, read as a unit, and never
  -- mutated field-by-field, so JSONB is the right shape for them.
  theme          JSONB NOT NULL,
  platform_notes JSONB NOT NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items are a separate table rather than a JSONB array on the month for one
-- specific reason: ticking Shoot/Edit/Posted must be an atomic single-row
-- UPDATE. Held as an array, two teammates ticking different boxes in the same
-- instant would read the same document and the later write would silently
-- discard the earlier one — the exact race the file-backed store has.
CREATE TABLE IF NOT EXISTS calendar_items (
  id            TEXT PRIMARY KEY,
  month_id      TEXT NOT NULL REFERENCES calendar_months(id) ON DELETE CASCADE,

  post_date     DATE NOT NULL,
  day           TEXT NOT NULL,
  week          INTEGER NOT NULL CHECK (week BETWEEN 1 AND 6),
  platform      TEXT NOT NULL CHECK (platform IN ('instagram', 'linkedin', 'youtube')),
  bucket        TEXT NOT NULL,
  format        TEXT NOT NULL,

  topic         TEXT NOT NULL,
  copy          TEXT NOT NULL,
  caption       TEXT NOT NULL,
  hashtags      TEXT[] NOT NULL DEFAULT '{}',
  hook          TEXT NOT NULL,
  cta           TEXT NOT NULL,
  seo_keywords  TEXT[] NOT NULL DEFAULT '{}',
  rationale     TEXT NOT NULL,

  shoot         BOOLEAN NOT NULL DEFAULT FALSE,
  edit          BOOLEAN NOT NULL DEFAULT FALSE,
  posted        BOOLEAN NOT NULL DEFAULT FALSE,

  live_link     TEXT,
  -- Set on YouTube Shorts cut from an Instagram reel. Self-referencing, and
  -- nulled rather than cascaded so re-planning Instagram cannot delete rows on
  -- another platform out from under the team.
  derived_from  TEXT REFERENCES calendar_items(id) ON DELETE SET NULL
);

-- The dashboard always reads one platform's month, in date order.
CREATE INDEX IF NOT EXISTS calendar_items_month_platform_idx
  ON calendar_items (month_id, platform, post_date);

-- Estimated model spend, so the monthly budget ceiling survives a restart and
-- is shared across instances rather than being per-process.
CREATE TABLE IF NOT EXISTS ai_spend (
  month_key   TEXT PRIMARY KEY CHECK (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  usd         NUMERIC(12, 6) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
