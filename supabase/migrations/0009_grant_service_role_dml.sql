-- Migration 0009 — grant DML to service_role on the dashboard tables.
--
-- 0002_grants only granted `authenticated`, so the `service_role` (the secret key /
-- backend automation role used by scripts/sync-from-disk.mjs) had no SELECT/INSERT/
-- UPDATE/DELETE and got "permission denied for table projects". Supabase normally
-- grants service_role on new tables; the migration-only setup missed it. service_role
-- has BYPASSRLS, so it acts as an admin — the secret key must stay server-only
-- (.env.local / never NEXT_PUBLIC_, never deployed to Vercel).
grant select, insert, update, delete on
  public.projects,
  public.todos,
  public.tiles,
  public.boards,
  public.habits,
  public.habit_entries
to service_role;
