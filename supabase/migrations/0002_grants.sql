-- Migration 0002 — grant table privileges to the `authenticated` role.
--
-- 0001 enabled RLS but relied on Supabase's default privileges to grant table
-- access. On this project those defaults weren't applied, so logged-in requests
-- (which use the `authenticated` Postgres role) hit "permission denied for table …".
--
-- These grants only give `authenticated` the privilege to run queries at all.
-- Row visibility is still governed by the owner-only RLS policies from 0001
-- (auth.uid() = user_id), so this does not weaken access control. We deliberately
-- do NOT grant `anon` — the app never touches these tables while signed out.

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.todos    to authenticated;
grant select, insert, update, delete on table public.tiles    to authenticated;
