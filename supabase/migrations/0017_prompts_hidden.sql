-- Migration 0017 — soft-delete (hide) for prompts.
--
-- The /prompts tab lets you hide prompts you don't want. `hidden` survives the disk sync:
-- sync-from-disk.mjs keeps the row (so it's never re-inserted), and its update path writes only
-- the mirrored columns — it never touches `hidden`. Default false so every existing and future
-- synced prompt stays visible. Reversible from the UI (Show hidden → Restore).
alter table public.prompts
  add column if not exists hidden boolean not null default false;

-- The active list filters on hidden; keep the common "visible, newest first" path cheap.
create index if not exists prompts_user_hidden_created_idx
  on public.prompts (user_id, hidden, created_at desc);
