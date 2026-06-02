-- Migration 0001 — initial schema (spec §4) + auth/RLS (spec §5)
-- Personal dashboard: single user, owner-only RLS, email allowlist as the real lock.

-- Enable extension for gen_random_uuid() if not already on
create extension if not exists pgcrypto;

-- updated_at helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- PROJECTS ------------------------------------------------------------------
create table projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  repo_url      text,
  live_url      text,
  status        text not null default 'active'
                  check (status in ('idea','active','paused','shipped','archived')),
  current_focus text,                         -- "where am I / next step" free text
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();
create index on projects (user_id, sort_order);

-- TODOS ---------------------------------------------------------------------
-- project_id NULL  => global todo
-- project_id set   => belongs to that project
create table todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references projects(id) on delete cascade,
  title       text not null,
  notes       text,
  done        boolean not null default false,
  due_date    date,
  priority    int  not null default 0,        -- 0 none, 1 low, 2 med, 3 high
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger todos_updated_at before update on todos
  for each row execute function set_updated_at();
create index on todos (user_id, project_id, done, sort_order);

-- TILES ---------------------------------------------------------------------
-- Generic tile. `type` selects a renderer; `config` is shape-per-type.
create table tiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,                  -- 'launcher' | 'todos' | 'project_status' | 'notes' | 'bookmarks' | ...
  title       text,
  config      jsonb not null default '{}'::jsonb,
  size        text not null default 'M' check (size in ('S','M','L')),
  sort_order  int  not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger tiles_updated_at before update on tiles
  for each row execute function set_updated_at();
create index on tiles (user_id, visible, sort_order);

-- ===========================================================================
-- AUTH & ACCESS CONTROL (spec §5)
-- ===========================================================================

-- (A) Optional DB-level email allowlist helper.
-- Defined here so it's ready to use, but NOT wired into the policies below by
-- default — see the commented "DB allowlist hardening" block at the bottom.
-- The real lock for now is the Next.js middleware allowlist (ALLOWED_EMAILS).
create or replace function is_allowed_user()
returns boolean language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email','')) = any (
    string_to_array(lower(current_setting('app.allowed_emails', true)), ',')
  )
$$;

-- (B) RLS — owner-only on every table.
alter table projects enable row level security;
alter table todos    enable row level security;
alter table tiles    enable row level security;

-- projects
create policy "own rows - select" on projects
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on projects
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on projects
  for delete using (auth.uid() = user_id);

-- todos
create policy "own rows - select" on todos
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on todos
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on todos
  for delete using (auth.uid() = user_id);

-- tiles
create policy "own rows - select" on tiles
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on tiles
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on tiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on tiles
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- OPTIONAL: DB allowlist hardening (belt-and-suspenders).
-- Enable ONLY after setting the GUC, or every query returns nothing:
--
--   alter database postgres set app.allowed_emails = 'you@example.com';
--
-- Then AND is_allowed_user() into each policy, e.g. for projects:
--
--   drop policy "own rows - select" on projects;
--   create policy "own rows - select" on projects
--     for select using (auth.uid() = user_id and is_allowed_user());
--   -- ...repeat insert/update/delete for projects, todos, tiles.
-- ---------------------------------------------------------------------------
