-- Migration 0010 — jobs table (read-only mirror of Job Hunter's jobs.json).
--
-- Populated by scripts/sync-from-disk.mjs (which reads the local Job Hunter
-- jobs/jobs.json) and displayed read-only at /jobs + the `job_hunter` tile.
-- Mirrors 0001 conventions; RLS uses the hardened wrapped form (0005/0007) and
-- grants both `authenticated` (the app reads) and `service_role` (the sync writes).
create table if not exists public.jobs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  external_id        text not null,                 -- Job Hunter's JH-xxxx id (sync key)
  project_id         uuid references public.projects(id) on delete set null,
  company            text,
  title              text,
  location           text,
  remote             text,
  source             text,
  url                text,
  match_score        int,
  why_it_fits        text,
  salary             text,
  status             text not null default 'New'
                       check (status in ('New','Interested','Tailored','Applied',
                                          'Interviewing','Offer','Rejected','Passed')),
  date_found         date,
  date_applied       date,
  next_action        text,
  notes              text,
  application_folder text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger jobs_updated_at before update on public.jobs
  for each row execute function set_updated_at();
create index if not exists jobs_user_status_idx on public.jobs (user_id, status);
-- One synced job per (user, Job Hunter id) — the mirror upsert/delete key.
create unique index if not exists jobs_user_external_id_key on public.jobs (user_id, external_id);

alter table public.jobs enable row level security;
create policy "own rows - select" on public.jobs
  for select using ((select auth.uid()) = user_id and (select public.is_allowed_user()));
create policy "own rows - insert" on public.jobs
  for insert with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
create policy "own rows - update" on public.jobs
  for update using ((select auth.uid()) = user_id and (select public.is_allowed_user()))
  with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
create policy "own rows - delete" on public.jobs
  for delete using ((select auth.uid()) = user_id and (select public.is_allowed_user()));

grant select, insert, update, delete on table public.jobs to authenticated, service_role;
