-- Migration 0008 — project disk-sync marker/identity (scripts/sync-from-disk.mjs).
--
-- The local sync script maps each folder under the code root to a project. It needs a
-- stable per-folder key AND a way to tell its own rows apart from manually-created
-- projects, so "mirror" cleanup (archive projects whose folder vanished) never touches
-- a project you made by hand. `external_path` serves both: NULL = manual project
-- (left alone); non-NULL = the absolute folder path this project mirrors.
alter table public.projects add column if not exists external_path text;

-- One synced project per (user, folder path). NULLs are distinct, so any number of
-- manual (NULL-path) projects coexist.
create unique index if not exists projects_user_external_path_key
  on public.projects (user_id, external_path);

comment on column public.projects.external_path is
  'Absolute folder path when managed by the disk-sync script; NULL for manual projects.';
