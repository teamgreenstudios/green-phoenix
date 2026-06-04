-- Migration 0007 — RLS initplan optimization (Supabase performance advisor 0003).
--
-- Recreates the policies from 0005 with the auth calls wrapped in scalar subselects:
--   (select auth.uid())  and  (select public.is_allowed_user())
-- Postgres then evaluates each once per query (InitPlan) instead of once per row.
-- Semantically identical to 0005 (a scalar subselect returns the same value); clears
-- the `auth_rls_initplan` advisor on all six dashboard tables. Verified live via the
-- same self-verifying transaction used in 0005 (authenticated-role row-count check).

-- projects ----------------------------------------------------------------------
drop policy "own rows - select" on public.projects;
create policy "own rows - select" on public.projects
  for select using ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - insert" on public.projects;
create policy "own rows - insert" on public.projects
  for insert with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - update" on public.projects;
create policy "own rows - update" on public.projects
  for update using ((select auth.uid()) = user_id and (select public.is_allowed_user()))
  with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - delete" on public.projects;
create policy "own rows - delete" on public.projects
  for delete using ((select auth.uid()) = user_id and (select public.is_allowed_user()));

-- todos -------------------------------------------------------------------------
drop policy "own rows - select" on public.todos;
create policy "own rows - select" on public.todos
  for select using ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - insert" on public.todos;
create policy "own rows - insert" on public.todos
  for insert with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - update" on public.todos;
create policy "own rows - update" on public.todos
  for update using ((select auth.uid()) = user_id and (select public.is_allowed_user()))
  with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - delete" on public.todos;
create policy "own rows - delete" on public.todos
  for delete using ((select auth.uid()) = user_id and (select public.is_allowed_user()));

-- tiles -------------------------------------------------------------------------
drop policy "own rows - select" on public.tiles;
create policy "own rows - select" on public.tiles
  for select using ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - insert" on public.tiles;
create policy "own rows - insert" on public.tiles
  for insert with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - update" on public.tiles;
create policy "own rows - update" on public.tiles
  for update using ((select auth.uid()) = user_id and (select public.is_allowed_user()))
  with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - delete" on public.tiles;
create policy "own rows - delete" on public.tiles
  for delete using ((select auth.uid()) = user_id and (select public.is_allowed_user()));

-- boards ------------------------------------------------------------------------
drop policy "own rows - select" on public.boards;
create policy "own rows - select" on public.boards
  for select using ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - insert" on public.boards;
create policy "own rows - insert" on public.boards
  for insert with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - update" on public.boards;
create policy "own rows - update" on public.boards
  for update using ((select auth.uid()) = user_id and (select public.is_allowed_user()))
  with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - delete" on public.boards;
create policy "own rows - delete" on public.boards
  for delete using ((select auth.uid()) = user_id and (select public.is_allowed_user()));

-- habits ------------------------------------------------------------------------
drop policy "own rows - select" on public.habits;
create policy "own rows - select" on public.habits
  for select using ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - insert" on public.habits;
create policy "own rows - insert" on public.habits
  for insert with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - update" on public.habits;
create policy "own rows - update" on public.habits
  for update using ((select auth.uid()) = user_id and (select public.is_allowed_user()))
  with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - delete" on public.habits;
create policy "own rows - delete" on public.habits
  for delete using ((select auth.uid()) = user_id and (select public.is_allowed_user()));

-- habit_entries -----------------------------------------------------------------
drop policy "own rows - select" on public.habit_entries;
create policy "own rows - select" on public.habit_entries
  for select using ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - insert" on public.habit_entries;
create policy "own rows - insert" on public.habit_entries
  for insert with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - update" on public.habit_entries;
create policy "own rows - update" on public.habit_entries
  for update using ((select auth.uid()) = user_id and (select public.is_allowed_user()))
  with check ((select auth.uid()) = user_id and (select public.is_allowed_user()));
drop policy "own rows - delete" on public.habit_entries;
create policy "own rows - delete" on public.habit_entries
  for delete using ((select auth.uid()) = user_id and (select public.is_allowed_user()));
