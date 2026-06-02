# Backlog — owner action items

Manual **infra / config** steps for the project owner that Claude can't (or shouldn't) do
from the agent environment. Code-side status lives in `CLAUDE.md` + git history; this file is
just the things waiting on you. Nothing here blocks further code work.

---

## 1. ~~Enable Supabase Realtime replication~~ — ✅ DONE (2026-06-02)

`todos` + `projects` are in the `supabase_realtime` publication and live sync was verified
end-to-end (direct-DB INSERT/UPDATE/DELETE merge into the open page with no reload). This
also surfaced + fixed a realtime-auth bug (the socket now calls `setAuth` so RLS-protected
`postgres_changes` include row data). To undo:
`alter publication supabase_realtime drop table public.todos, public.projects;`

> Note: the dashboard `project_status` **tile** reads server-seeded data and intentionally
> stays static. The todos tiles, `/todos`, and `/projects` update live.

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
