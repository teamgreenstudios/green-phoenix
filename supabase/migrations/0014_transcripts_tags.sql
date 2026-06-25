-- Migration 0014 — topic tags for transcripts (instascrape M3).
--
-- instascrape's summary.json now includes a small `tags` array (2-5 reusable, lowercase
-- topic labels); scripts/sync-from-disk.mjs mirrors it here so /transcripts can show tag
-- chips and filter by topic. Read-only mirror — existing RLS policies + table grants (0012)
-- already cover the new column.
alter table public.transcripts
  add column if not exists tags jsonb not null default '[]'::jsonb;  -- string[]
