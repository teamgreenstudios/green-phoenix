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
  `ALLOWED_EMAILS` (plus the optional `STEAM_API_KEY` / `GITHUB_TOKEN` from §4 if you use those tiles).
- Supabase → Auth → URL Configuration: add the production Vercel domain to **Site URL** and
  **Redirect URLs** (so Google OAuth + magic links work in prod).

---

## 3. ~~Database-level email allowlist — defense in depth~~ — ✅ DONE (2026-06-03)

`public.is_allowed_user()` is now AND-ed into every RLS policy on all six user-data tables
(`projects`/`todos`/`tiles`/`boards`/`habits`/`habit_entries`) — see
`supabase/migrations/0005_db_allowlist_hardening.sql`. Applied + verified live (allowlisted
users keep their rows; spoofed / non-allowlisted emails get zero).

> DEVIATION: the spec used a GUC (`alter database postgres set app.allowed_emails = …`), but the
> Supabase MCP/pooler role is denied `ALTER DATABASE`. So the allowlist is **hardcoded in the
> `is_allowed_user()` function** instead — version-controlled and auditable in the migration.
> **Keep it in sync** with `ALLOWED_EMAILS` (proxy.ts + Vercel env) and the Supabase auth users.
> Current list: `robgreen31@gmail.com`, `robgreen31+dash@gmail.com`, `teamgreenstudios@gmail.com`.
> To change it: edit the `array[...]` in `is_allowed_user()` and re-apply.

### Optional follow-ups surfaced while doing this (low priority)
- **`auth_rls_initplan`** (advisor, INFO): the 24 policies call `auth.uid()` / `is_allowed_user()`
  per row. Wrapping them as `(select auth.uid())` / `(select public.is_allowed_user())` lets
  Postgres evaluate each once per query. Zero behavior change, tiny perf win at single-user scale.
- **Leaked-password protection** is OFF (advisor, WARN). **Not actionable on the current plan** —
  the HaveIBeenPwned toggle (Supabase → Authentication → Password) is a **Pro-plan feature** and
  this project is on the free/Hobby tier. The advisor will keep flagging it; safe to ignore unless
  the project is later upgraded to Pro. (Low relevance anyway — auth is Google/magic-link.)

---

## 4. (Optional) GitHub / Steam tile tokens — live data-source tiles

The GitHub and Steam tiles (Phase 4) render without setup but show richer data with credentials.
Set these as **server-only** env vars (in `.env.local` locally, and in Vercel for prod — never
`NEXT_PUBLIC_`):

- **`STEAM_API_KEY`** — *required* for the Steam tile's live data (recently-played). Grab one at
  https://steamcommunity.com/dev/apikey. Without it the tile shows "Set STEAM_API_KEY to enable".
- **`GITHUB_TOKEN`** — *optional*. The GitHub tile already shows public activity from just a
  username; a read-only PAT adds private activity + higher rate limits.

Migration `0004_phase4.sql` is already applied to the project.

---

_Last updated 2026-06-03 — DB email-allowlist hardening (§3, migration 0005) + FK covering
indexes (migration 0006) applied & verified. Remaining open items: §2 done, §4 (Steam/GitHub
tokens) still optional._
