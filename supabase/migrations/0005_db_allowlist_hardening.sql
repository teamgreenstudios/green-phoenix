-- Migration 0005 — DB-level email allowlist hardening (defense in depth, spec §5).
--
-- Until now the email allowlist lived ONLY in proxy.ts (lib/auth.ts#isAllowedEmail);
-- RLS was owner-only (auth.uid() = user_id), and is_allowed_user() existed but was
-- not wired into any policy. This migration ANDs is_allowed_user() into every policy
-- on every user-data table, so a stranger who completed the OAuth flow still cannot
-- read/write rows even if they reached the database directly.
--
-- DEVIATION FROM SPEC: the spec stores the allowlist in a GUC
--   (current_setting('app.allowed_emails')) set via `alter database postgres set ...`.
-- That ALTER requires privileges the Supabase MCP/pooler role does not have
-- ("permission denied to set parameter"). So the allowlist is instead hardcoded in
-- is_allowed_user() below. Upside: the allowlist is version-controlled and auditable
-- here; downside: changing it means editing this function (a one-line migration), not
-- a config var. Keep this list in sync with ALLOWED_EMAILS (proxy.ts) and Vercel env.
--
-- SAFETY: applied inside a single transaction whose tail re-checked, as the
-- `authenticated` role, that each allowlisted user still saw their exact baseline row
-- counts and a non-allowlisted email saw nothing — so a lockout would have rolled the
-- whole thing back. Verified live afterward (allowed users keep their rows; spoofed /
-- substring-match emails get zero).

-- ── Allowlist source of truth (hardcoded; see deviation note above) ────────────
create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = any (array[
    'robgreen31@gmail.com',
    'robgreen31+dash@gmail.com',
    'teamgreenstudios@gmail.com'
  ])
$$;

-- ── AND is_allowed_user() into every owner-only policy (6 tables × 4 cmds) ─────
-- projects ----------------------------------------------------------------------
drop policy "own rows - select" on public.projects;
create policy "own rows - select" on public.projects
  for select using (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - insert" on public.projects;
create policy "own rows - insert" on public.projects
  for insert with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - update" on public.projects;
create policy "own rows - update" on public.projects
  for update using (auth.uid() = user_id and public.is_allowed_user())
  with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - delete" on public.projects;
create policy "own rows - delete" on public.projects
  for delete using (auth.uid() = user_id and public.is_allowed_user());

-- todos -------------------------------------------------------------------------
drop policy "own rows - select" on public.todos;
create policy "own rows - select" on public.todos
  for select using (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - insert" on public.todos;
create policy "own rows - insert" on public.todos
  for insert with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - update" on public.todos;
create policy "own rows - update" on public.todos
  for update using (auth.uid() = user_id and public.is_allowed_user())
  with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - delete" on public.todos;
create policy "own rows - delete" on public.todos
  for delete using (auth.uid() = user_id and public.is_allowed_user());

-- tiles -------------------------------------------------------------------------
drop policy "own rows - select" on public.tiles;
create policy "own rows - select" on public.tiles
  for select using (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - insert" on public.tiles;
create policy "own rows - insert" on public.tiles
  for insert with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - update" on public.tiles;
create policy "own rows - update" on public.tiles
  for update using (auth.uid() = user_id and public.is_allowed_user())
  with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - delete" on public.tiles;
create policy "own rows - delete" on public.tiles
  for delete using (auth.uid() = user_id and public.is_allowed_user());

-- boards ------------------------------------------------------------------------
drop policy "own rows - select" on public.boards;
create policy "own rows - select" on public.boards
  for select using (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - insert" on public.boards;
create policy "own rows - insert" on public.boards
  for insert with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - update" on public.boards;
create policy "own rows - update" on public.boards
  for update using (auth.uid() = user_id and public.is_allowed_user())
  with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - delete" on public.boards;
create policy "own rows - delete" on public.boards
  for delete using (auth.uid() = user_id and public.is_allowed_user());

-- habits ------------------------------------------------------------------------
drop policy "own rows - select" on public.habits;
create policy "own rows - select" on public.habits
  for select using (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - insert" on public.habits;
create policy "own rows - insert" on public.habits
  for insert with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - update" on public.habits;
create policy "own rows - update" on public.habits
  for update using (auth.uid() = user_id and public.is_allowed_user())
  with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - delete" on public.habits;
create policy "own rows - delete" on public.habits
  for delete using (auth.uid() = user_id and public.is_allowed_user());

-- habit_entries -----------------------------------------------------------------
drop policy "own rows - select" on public.habit_entries;
create policy "own rows - select" on public.habit_entries
  for select using (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - insert" on public.habit_entries;
create policy "own rows - insert" on public.habit_entries
  for insert with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - update" on public.habit_entries;
create policy "own rows - update" on public.habit_entries
  for update using (auth.uid() = user_id and public.is_allowed_user())
  with check (auth.uid() = user_id and public.is_allowed_user());
drop policy "own rows - delete" on public.habit_entries;
create policy "own rows - delete" on public.habit_entries
  for delete using (auth.uid() = user_id and public.is_allowed_user());
