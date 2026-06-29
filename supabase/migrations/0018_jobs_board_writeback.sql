-- Migration 0018 — make the /jobs board write-capable (two-way sync).
--
-- The jobs table was a strictly read-only mirror of Job Hunter's jobs.json. We now let the
-- board move jobs through their pipeline (status/date_applied/next_action/notes). To keep
-- jobs.json the single source of truth, the disk sync (scripts/sync-from-disk.mjs) reconciles
-- per-row with a dirty flag:
--   * board_dirty = true  → the board edited pipeline fields since the last sync; the sync
--                           pushes them back into jobs.json (via tracker.py) and clears the flag.
--   * board_dirty = false → disk wins; the sync mirrors pipeline fields disk→DB as before.
-- Scouting fields (company/title/url/match_score/…) are always disk→DB, unaffected by this.
alter table public.jobs
  add column if not exists board_dirty boolean not null default false;

-- Doc surfacing: the sync stats applications/<application_folder>/ and sets these so the board
-- can show "Resume ✓ / Cover letter ✓" badges. Sync-owned (scouting), always disk→DB.
alter table public.jobs
  add column if not exists has_resume boolean not null default false;

alter table public.jobs
  add column if not exists has_cover_letter boolean not null default false;

-- The write-back step scans for rows the board touched; keep that lookup cheap.
create index if not exists jobs_user_board_dirty_idx
  on public.jobs (user_id, board_dirty) where board_dirty;
