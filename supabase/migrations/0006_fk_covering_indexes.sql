-- Migration 0006 — covering indexes for FK columns (Supabase performance advisor).
--
-- The composite indexes from 0001/0004 lead with user_id, so a lookup on the FK
-- column alone (e.g. the referential-integrity scan on ON DELETE CASCADE) isn't
-- covered. Low impact at single-user scale, but cheap and clean. Clears the
-- `unindexed_foreign_keys` (0001) advisor for public.tiles and public.todos.
--
-- Note: brand-new indexes briefly surface under the `unused_index` advisor until
-- they're first scanned — expected, not a problem.
create index if not exists idx_tiles_board_id   on public.tiles (board_id);
create index if not exists idx_todos_project_id on public.todos (project_id);
