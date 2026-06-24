-- Migration 0015 — referenced tools/links for transcripts (instascrape "tools & links cited").
--
-- instascrape's summary.json now includes a `references` array (tools/apps/products,
-- off-platform links, handles, promo codes the post points to). sync-from-disk.mjs mirrors it
-- into this column so /transcripts can show a cross-post "referenced across posts" view + filter.
-- Named `refs` (not `references`) because `references` is a reserved SQL keyword. Read-only
-- mirror — existing RLS policies + table grants (0012) already cover the new column.
alter table public.transcripts
  add column if not exists refs jsonb not null default '[]'::jsonb;  -- {name, kind}[]
