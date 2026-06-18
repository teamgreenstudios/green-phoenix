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

### Follow-ups surfaced while doing this
- ~~**`auth_rls_initplan`** advisor~~ — ✅ DONE (migration 0007). All 24 policies now wrap their
  auth calls as `(select auth.uid())` / `(select public.is_allowed_user())`, so they're evaluated
  once per query instead of per row. The dashboard's `public` schema is now clear of WARN-level
  performance advisories (only expected `unused_index` INFO notes remain on the new/single-user
  indexes; all other advisor noise belongs to the separate `travel_pins` app in the same project).
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

## 5. Disk sync — service-role key + auto-sync (ACTIVE)

**Status:** `SUPABASE_SERVICE_ROLE_KEY` is configured in `.env.local`, the sync is verified, and
an auto-sync **cron job runs every 30 min** (see "Auto-sync" below).

`npm run sync` (`scripts/sync-from-disk.mjs`) mirrors the folders under
`/home/robgreen/projects` into projects, and each folder's `BACKLOG.md`
GFM checkboxes into that project's todos. It runs **locally only** (a Vercel server can't
read your disk) and writes via the Supabase **service-role** secret.

One-time enable:
- Supabase → Settings → API → copy the **service_role** secret.
- Add to `.env.local` (gitignored; never `NEXT_PUBLIC_`, never deploy to Vercel):
  `SUPABASE_SERVICE_ROLE_KEY=...`
- Preview with `npm run sync -- --dry-run`, then apply with `npm run sync`.
- Optional overrides: `SYNC_CODE_ROOT`, `SYNC_USER_EMAIL` (default `robgreen31@gmail.com`),
  `SYNC_IGNORE` (comma-separated folder names, e.g. `Green Phoenix`).

Conventions: one project per top-level folder (keyed by `projects.external_path`, migration
0008); only `- [ ]` / `- [x]` checkbox lines become todos (tagged `disk-sync`, `[x]` = done).
MIRROR mode — vanished folders get archived, removed checkboxes get deleted; manual
projects/todos (no `external_path` / no `disk-sync` tag) are never touched.

The same `npm run sync` also mirrors the **Job Hunter** app's `jobs/jobs.json` into the `jobs`
table (migration 0010, keyed by `external_id`) and surfaces it **read-only** at `/jobs` (KPI cards
+ status pipeline) plus the `job_hunter` dashboard tile. Override the source with
`SYNC_JOBHUNTER_DIR` (default `<code root>/Job Hunter`). No editing/write-back to `jobs.json`.

### Auto-sync — cron (Linux)

A cron job runs `scripts/run-sync.sh` (it `cd`s to the repo root so `.env.local` loads, runs
`node scripts/sync-from-disk.mjs`, and appends to `sync.log`) **every 30 min**. Keeps Supabase
current from `jobs.json` / `BACKLOG.md` automatically, so the dashboard is always fresh.

Manage it (cron):

    crontab -e                            # add / edit / remove the schedule line
    crontab -l                            # view scheduled jobs
    ./scripts/run-sync.sh                 # run now (manual)
    tail -n 20 sync.log                   # see results

The schedule line (every 30 min):

    */30 * * * * /home/robgreen/projects/Green\ Phoenix/scripts/run-sync.sh

### Refresh from the UI

`/jobs` and the `job_hunter` tile have a **Refresh** control (`components/jobs/jobs-refresh.tsx`)
that calls `router.refresh()` to re-query **Supabase** instantly (no reload). It does NOT read
`jobs.json` — that's the sync's job (manual `npm run sync` or the auto-sync task above). The
"Updated …" freshness hint uses `formatRelativeTime` in `lib/format-time.ts`.

---

## 6. Deployment (Vercel) — repo connection + how to deploy

The Vercel project **green-phoenix** (team `teamgreendatas-projects`, project id
`prj_gZUfR5d9jXFws8b5tEJOJeYQFW9K`) serves the prod domain **green-phoenix-sable.vercel.app**.
Its Git integration is authorized through the **`teamgreendata`** GitHub account, which can't
see the `teamgreenstudios` org — so it can only deploy from **`teamgreendata/green-phoenix`**
(private), NOT `teamgreenstudios/green-phoenix` (public) where the code is normally worked on
(`origin`). For a long stretch this meant pushes to `main` never deployed (prod sat on a stale
build); `/jobs` 404'd until this was sorted.

**Current deploy setup:** code is pushed to **both** repos. `teamgreendata/green-phoenix` is the
**deploy source** (connect it in Vercel, Production Branch = `main`); `teamgreenstudios/green-phoenix`
remains the working `origin`. Keep them in sync (push `main` to both). Your machine is logged into
both GitHub accounts via `gh` (`gh auth switch --user teamgreendata|teamgreenstudios`).

**Alternative deploy — direct CLI upload (no git, "option 2"):** bypasses the git connection
entirely; handy when repo wiring is in flux.
- Create a Vercel token: https://vercel.com/account/settings/tokens
- `npm i -g vercel` (the CLI isn't installed by default)
- From the project root (the dir with `.vercel/`): `vercel deploy --prod --token=<TOKEN> --yes`

**Cleanest long-term fix (deferred):** install the Vercel GitHub App on the `teamgreenstudios`
org (or sign in to Vercel with the teamgreenstudios GitHub account) so Vercel can deploy
`teamgreenstudios/green-phoenix` directly — eliminating the two-repo split. Then drop the
`teamgreendata/green-phoenix` deploy mirror.

> Note: Vercel **env vars + domain live on the project**, not the repo, so changing the connected
> repo on the existing green-phoenix project keeps `green-phoenix-sable.vercel.app` and all env vars.
> Migrations apply to the shared Supabase DB out-of-band — no deploy-time DB step.

---

_Last updated 2026-06-06 — auto-sync scheduled task (`GreenPhoenix-DiskSync`, every 30 min) +
UI Refresh button on `/jobs`/tile (§5); dialog overflow fix. Earlier: Job Hunter mirror (0010,
`/jobs` + tile), Vercel deploy setup (§6 — deploy source `teamgreendata/green-phoenix`),
disk-sync (0008), RLS initplan (0007), service_role grant (0009), email-allowlist (0005), FK
indexes (0006). Open: §4 (Steam/GitHub tokens) optional; §6 long-term fix (connect Vercel to the
teamgreenstudios org) deferred._
