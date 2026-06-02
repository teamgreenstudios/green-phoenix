-- Migration 0004 — Phase 4 feature expansion.
-- Adds: todo tags + completion timestamp; multiple dashboards (boards) with a
-- board_id on tiles; habits + habit_entries. Mirrors 0001 conventions
-- (uuid PK, user_id FK on delete cascade, set_updated_at trigger, (user_id, …)
-- index, owner-only RLS) and 0002 grants (authenticated). Projects/todos stay
-- global; only tiles are board-scoped.

-- ── TODOS: tags + completion timestamp ─────────────────────────────────────
alter table todos add column if not exists tags text[] not null default '{}';
alter table todos add column if not exists completed_at timestamptz;
-- Seed the completion heatmap with best-effort historical data.
update todos set completed_at = updated_at where done = true and completed_at is null;

-- ── BOARDS (multiple dashboards) ───────────────────────────────────────────
create table if not exists boards (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger boards_updated_at before update on boards
  for each row execute function set_updated_at();
create index on boards (user_id, sort_order);

alter table boards enable row level security;
create policy "own rows - select" on boards
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on boards
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on boards
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on boards
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.boards to authenticated;

-- tiles.board_id + backfill a default board per user, then assign existing tiles.
alter table tiles add column if not exists board_id uuid references boards(id) on delete cascade;

insert into boards (user_id, name, sort_order)
  select distinct user_id, 'Dashboard', 0 from tiles
  where not exists (select 1 from boards b where b.user_id = tiles.user_id);

update tiles t
  set board_id = b.id
  from boards b
  where b.user_id = t.user_id and t.board_id is null;

create index on tiles (user_id, board_id, sort_order);

-- ── HABITS + entries ───────────────────────────────────────────────────────
create table if not exists habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  color       text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger habits_updated_at before update on habits
  for each row execute function set_updated_at();
create index on habits (user_id, sort_order);

alter table habits enable row level security;
create policy "own rows - select" on habits
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on habits
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on habits
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on habits
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.habits to authenticated;

-- One row per (habit, day) marks that habit done on that day.
create table if not exists habit_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  habit_id    uuid not null references habits(id) on delete cascade,
  day         date not null,
  created_at  timestamptz not null default now(),
  unique (habit_id, day)
);
create index on habit_entries (user_id, habit_id, day);

alter table habit_entries enable row level security;
create policy "own rows - select" on habit_entries
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on habit_entries
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on habit_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on habit_entries
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on table public.habit_entries to authenticated;
