-- Migration 0013 — enrich transcripts with the instascrape summary digest.
--
-- The 0012 table mirrored only the raw transcript.txt. instascrape now also writes a
-- per-post summary.json (headline / summary / takeaways / key_points) and post facets
-- (post_type / n_slides); scripts/sync-from-disk.mjs reads those and populates the columns
-- below so /transcripts can show summary tiles + a point-by-point breakdown instead of a
-- raw transcript dump. Read-only mirror — existing RLS policies and table grants (0012)
-- already cover the new columns; no policy/grant changes needed.
alter table public.transcripts
  add column if not exists headline   text,                       -- summary.json headline (best title)
  add column if not exists summary    text,                       -- 2-4 sentence summary
  add column if not exists takeaways  jsonb not null default '[]'::jsonb,  -- string[]
  add column if not exists key_points jsonb not null default '[]'::jsonb,  -- {point, detail}[]
  add column if not exists post_type  text,                       -- reel | image | carousel
  add column if not exists n_slides   int;
