-- Migration 0016 — prompts table (read-only mirror of instascrape output).
--
-- instascrape extracts verbatim copy-paste prompts from each post's transcript into a per-post
-- prompts.json; scripts/sync-from-disk.mjs mirrors them here (MANY rows per post) for the
-- /prompts tab. Each row is one prompt, keyed external_id = "<shortcode>#<index>". Mirrors the
-- 0012 transcripts pattern: hardened RLS + grants to `authenticated` (app reads) and
-- `service_role` (the sync writes).
create table if not exists public.prompts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  external_id            text not null,            -- "<shortcode>#<index>" (sync key)
  transcript_external_id text,                     -- source post shortcode (links to /transcripts)
  source_url             text,                     -- the post URL
  title                  text,
  content                text,                     -- the verbatim prompt
  target_tool            text,                     -- claude | chatgpt | gemini | any | ...
  category               text,                     -- one of the fixed taxonomy
  tags                   jsonb not null default '[]'::jsonb,  -- string[] scenario tags
  project_id             uuid references public.projects(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create trigger prompts_updated_at before update on public.prompts
  for each row execute function set_updated_at();
-- One row per (user, prompt) — the mirror upsert/delete key.
create unique index if not exists prompts_user_external_id_key
  on public.prompts (user_id, external_id);
create index if not exists prompts_user_created_idx on public.prompts (user_id, created_at desc);
create index if not exists prompts_transcript_external_id_idx
  on public.prompts (transcript_external_id);
create index if not exists prompts_tags_gin on public.prompts using gin (tags);

alter table public.prompts enable row level security;
create policy "own rows - select" on public.prompts
  for select using ((select auth.uid()) = user_id and (select public.is_allowed_user()));
create policy "own rows - insert" on public.prompts
  for insert with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
create policy "own rows - update" on public.prompts
  for update using ((select auth.uid()) = user_id and (select public.is_allowed_user()))
  with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
create policy "own rows - delete" on public.prompts
  for delete using ((select auth.uid()) = user_id and (select public.is_allowed_user()));

grant select, insert, update, delete on table public.prompts to authenticated, service_role;
