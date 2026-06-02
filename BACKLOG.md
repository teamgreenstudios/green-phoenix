# Backlog — owner action items

Manual **infra / config** steps for the project owner that Claude can't (or shouldn't) do
from the agent environment. Code-side status lives in `CLAUDE.md` + git history; this file is
just the things waiting on you. Nothing here blocks further code work.

---

## 1. Enable Supabase Realtime replication — unblocks Phase 3 live updates

The realtime wiring (Phase 3 M2) is built but **inert until replication is on** (the
`supabase_realtime` publication is currently empty). The app runs fine without it; live
sync just won't fire.

- **Dashboard:** Database → Publications → `supabase_realtime` → enable **`todos`** and **`projects`**.
- **or SQL:**
  ```sql
  alter publication supabase_realtime add table public.todos, public.projects;
  ```
- No `REPLICA IDENTITY` change needed (delete events carry the `id` primary key).
- `tiles` is **not** wired for realtime — leave it off.
- **Verify:** open the app in two tabs as the same user — toggling a todo or editing a
  project's status in one tab updates the other without a refresh.

> Note: the dashboard `project_status` **tile** reads server-seeded data and intentionally
> stays static. Todos tiles, `/todos`, and `/projects` do update live.

---

## 2. M4 — Deploy to Vercel (infra only, no code)

Deferred since Phase 1. Pure infra:

- Push the repo to GitHub.
- Import the project into Vercel (Hobby tier).
- Set env vars in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `ALLOWED_EMAILS`.
- Supabase → Auth → URL Configuration: add the production Vercel domain to **Site URL** and
  **Redirect URLs** (so Google OAuth + magic links work in prod).

---

## 3. (Optional) Database-level email allowlist — defense in depth

Today the allowlist is enforced in `proxy.ts` (`lib/auth.ts#isAllowedEmail`). The DB helper
`is_allowed_user()` exists in the migration but isn't wired into RLS (policies are owner-only
`auth.uid() = user_id`). To add belt-and-suspenders (spec §5):

- `alter database postgres set app.allowed_emails = 'robgreen31@gmail.com,robgreen31+dash@gmail.com';`
- AND `is_allowed_user()` into each table's RLS `using` / `with check` (the clause is commented
  in `supabase/migrations/0001_init.sql`).

---

_Last updated 2026-06-02, after Phase 3 (drag-and-drop reorder + realtime wiring)._
