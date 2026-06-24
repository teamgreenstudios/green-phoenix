-- Migration 0012 — transcripts table (read-only mirror of instascrape output).
--
-- Populated by scripts/sync-from-disk.mjs (which reads the local instascrape
-- data/assets/research/<shortcode>/transcript.txt files) and displayed
-- read-only at /transcripts. Mirrors the 0010 jobs pattern: RLS uses the
-- hardened wrapped form (0005/0007) and grants both `authenticated` (the app
-- reads) and `service_role` (the sync writes).
create table if not exists public.transcripts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  external_id  text not null,                 -- instagram reel shortcode (sync key)
  project_id   uuid references public.projects(id) on delete set null,
  url          text,                          -- https://www.instagram.com/reel/<shortcode>/
  title        text,                          -- first spoken line (derived), for the list
  content      text,                          -- full merged transcript.txt
  char_count   int,
  line_count   int,
  scraped_at   timestamptz,                   -- transcript.txt mtime
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger transcripts_updated_at before update on public.transcripts
  for each row execute function set_updated_at();
create index if not exists transcripts_user_idx on public.transcripts (user_id, scraped_at desc);
-- One synced transcript per (user, shortcode) — the mirror upsert/delete key.
create unique index if not exists transcripts_user_external_id_key
  on public.transcripts (user_id, external_id);

alter table public.transcripts enable row level security;
create policy "own rows - select" on public.transcripts
  for select using ((select auth.uid()) = user_id and (select public.is_allowed_user()));
create policy "own rows - insert" on public.transcripts
  for insert with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
create policy "own rows - update" on public.transcripts
  for update using ((select auth.uid()) = user_id and (select public.is_allowed_user()))
  with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
create policy "own rows - delete" on public.transcripts
  for delete using ((select auth.uid()) = user_id and (select public.is_allowed_user()));

grant select, insert, update, delete on table public.transcripts to authenticated, service_role;
