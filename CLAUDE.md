@AGENTS.md

# Personal Dashboard

Source of truth for the build: `dashboard-spec.md`. Single-user "launcher + cockpit"
with an extensible tile system. Scoped one **Phase** at a time (see spec §10); build in
**milestones and pause** after each so the user can run it.

<!-- BEGIN:baseline-conventions (synced by scripts/sync-baseline.py — edit blocks there, then re-run) -->
## Baseline conventions

- **Always recommend when asking.** With `AskUserQuestion` or options in prose, name the option you'd pick, whether the lean is **strong** or **weak**, and a one-line why — no neutral menus.
- **Build in milestones and pause** so the user can run each slice before you go deeper; don't start a major new phase without a go-ahead.
- **Keep this file current** — folding session gotchas, non-obvious behavior, and decisions back into `CLAUDE.md` is a pre-commit step, not an afterthought.
- **Verify behavior, not just types** — run `npm run build` + `npm run lint` before committing UI changes and actually exercise user-facing changes (local or live) before claiming they work. Small, reviewable commits; run tests on every change.
- **Stack:** recent Next.js ≠ training data — read `node_modules/next/dist/docs/` before routing/data-fetching; middleware is `proxy.ts`, and `await` `params`/`searchParams`. Supabase via `@supabase/ssr` with `getUser()` (never `getSession()`). Publishable/anon key only in client code — never the service-role key (RLS enforces access). DB scripts use psycopg + `DATABASE_URL`. Never commit secrets or `.env`.
- Keep answers concise and direct.
<!-- END:baseline-conventions -->

## Stack (pinned)
- Next.js 16 (App Router, Turbopack) + React 19, TypeScript, no `src/` dir, alias `@/*`.
- Tailwind v4 (CSS config in `app/globals.css`) + **shadcn v4** → components on **Base UI**
  (`@base-ui/react`), **not Radix**. Use the `render` prop (not `asChild`) and `onClick`
  (not `onSelect`) on menu items. `next-themes` (dark default, `enableSystem={false}`).
- Supabase via `@supabase/ssr` (`createBrowserClient`/`createServerClient`, `getAll`/`setAll`).
  Auth checks use `getUser()`, never `getSession()`.

## Conventions that bite
- Root request guard is **`proxy.ts`** (Next 16 renamed `middleware.ts` → `proxy.ts`;
  exported function is `proxy`). The internal helper is still `lib/supabase/middleware.ts`.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (falls back to
  `_ANON_KEY`), and `ALLOWED_EMAILS` (server-only; the real access lock). See `.env.local.example`.
- Email allowlist is enforced in `proxy.ts` (`lib/auth.ts#isAllowedEmail`) **and** in the DB:
  as of `0005_db_allowlist_hardening.sql`, `public.is_allowed_user()` is AND-ed into every
  RLS policy on all six user-data tables (`projects`/`todos`/`tiles`/`boards`/`habits`/
  `habit_entries`). Deviation from spec §5: the allowlist is **hardcoded in `is_allowed_user()`**
  (not a `current_setting('app.allowed_emails')` GUC) because the MCP/pooler role lacks
  `ALTER DATABASE` privilege. Keep that hardcoded list in sync with `ALLOWED_EMAILS` (proxy.ts
  + Vercel env). Current allowlist: `robgreen31@gmail.com`, `robgreen31+dash@gmail.com`,
  `teamgreenstudios@gmail.com`.

## Milestone status
- **M0 (done):** scaffold, `supabase/migrations/0001_init.sql`, Supabase clients, Google +
  magic-link auth, `/auth/callback`, proxy allowlist guard, `/not-authorized`, dark theme.
- **M1 (done):** shared authenticated `app/(app)/layout.tsx` (auth guard + header w/ `MainNav`);
  Projects CRUD at `/projects` — list/create/edit/delete/reorder/status/current_focus via
  Server Actions in `app/(app)/projects/actions.ts` (RLS-scoped). Dashboard moved to `app/(app)/page.tsx`.
- **M2 (done):** Todos — reusable client `components/todos/TodoList` (add/toggle/edit/delete/reorder,
  due date, priority) over Server Actions in `app/(app)/todos/actions.ts`. Surfaces: global `/todos`
  and per-project `/projects/[id]` detail page. Project card titles link to the detail page.
- **M3 (done):** Tile system — registry (`components/tiles/registry.ts`) + per-type defs in
  `components/tiles/defs/{launcher,todos,project-status}.tsx` (renderer + config form + meta);
  `TileBoard` (client edit-mode: add/reorder/resize S-M-L/hide/edit/delete) + `TileCard`; tile
  Server Actions in `app/(app)/tiles/actions.ts`. Dashboard `/` is the responsive tile grid.
  Edit-mode toggle lives on the dashboard (not the global header) since it's dashboard-specific.
- **Phase 2 (done):** two more renderers — `bookmarks` and `notes` (markdown via `react-markdown` +
  `rehype-sanitize` + `remark-gfm`, **inline-editable on the tile**) — plus placeholder data-source
  tiles `steam`/`media` (shared scaffold `components/tiles/defs/data-source-tile.tsx` + stub action
  `app/(app)/tiles/data-sources.ts`; **stubs only**, no live integration). Generic **per-tile refresh**
  (`refreshable` + `refreshNonce` on the tile contract; refresh button in `TileCard`). Shared
  config-form helpers `components/tiles/config-fields.tsx` (`Field`, `LinkItemsEditor`; launcher
  rewired to it). Renderer contract gained `id` + `onConfigSaved` (inline save). Light-mode pass:
  light `--primary`/`--ring` darkened to `oklch(0.52 0.13 159)` for WCAG AA. New deps:
  react-markdown, rehype-sanitize, remark-gfm.
- **Phase 3 (done, except SSO):** drag-and-drop tile reorder via **dnd-kit** (grip handle in edit
  mode; `reorderTiles` action writes `sort_order`; resize stays on the S/M/L buttons). **Supabase
  realtime** wiring — reusable `lib/hooks/use-realtime.ts`; `TodoList` merges live todo changes by
  id; `components/projects/realtime-projects.tsx` does `router.refresh()` on `/projects` +
  `/projects/[id]`. Replication is **enabled** on `todos`/`projects` and realtime is **verified
  end-to-end** (the hook calls `supabase.realtime.setAuth` so RLS `postgres_changes` include row
  data — fix `564c008`). Cross-app **SSO intentionally skipped** (spec §11, out of scope). New deps:
  `@dnd-kit/{core,sortable,utilities}`.
- **Phase 4 (done):** glanceable tiles (`weather` via Open-Meteo, `pomodoro`, `countdown`); ⌘K
  **command palette + search** (`cmdk`; `components/command-palette.tsx`); **accent picker**
  (`data-accent` overrides in `globals.css` + a no-flash inline script in the root layout);
  **export/import** tiles (account menu); **todo tags** + filter + `completed_at`; **Today** +
  **activity heatmap** tiles; **habit tracker** (`app/(app)/habits/`, `defs/habits.tsx`); **multiple
  dashboards** (`boards` + `tiles.board_id`; `lib/load-dashboard.ts`, route `/b/[boardId]`,
  `components/{board-tabs,dashboard-view}.tsx`; tiles are board-scoped, projects/todos global);
  **GitHub/Steam** data tiles (`defs/github.tsx` + live fetches in `tiles/data-sources.ts`, graceful
  without tokens); **PWA** (`app/manifest.ts`, `public/{icon.svg,sw.js}`, viewport themeColor) +
  mobile-overflow polish. Migration `0004_phase4.sql` is applied. New dep: `cmdk`. Optional owner
  env: `GITHUB_TOKEN`, `STEAM_API_KEY` (see `BACKLOG.md`).
- **Post-Phase-4 hardening:** DB-level email allowlist AND-ed into all RLS (`0005`); FK covering
  indexes (`0006`); RLS initplan `(select …)` wrapping (`0007`). The `public` schema is clear of
  WARN-level Supabase advisors. Allowlist is **hardcoded in `is_allowed_user()`** (not a GUC). See `BACKLOG.md`.
- **Disk sync (local CLI):** `scripts/sync-from-disk.mjs` (`npm run sync`; `-- --dry-run` to preview)
  mirrors the folders under `SYNC_CODE_ROOT` (default `/home/robgreen/projects`) into
  `projects` (one per folder, keyed by `projects.external_path`, migration `0008`) and each folder's
  `BACKLOG.md` **GFM checkboxes** into that project's `todos` (tagged `disk-sync`). MIRROR mode:
  vanished folders → project archived, removed checkboxes → todo deleted; manual rows untouched.
  Runs **locally only** (a Vercel server can't read your disk) and writes via the **service-role key**
  (`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`) for `SYNC_USER_EMAIL`. No new npm deps.
- **Job Hunter (Phase 5 — read-only mirror):** the separate local Job Hunter app's
  `jobs/jobs.json` is mirrored into a new `jobs` table (migration `0010`) by the same
  `npm run sync` (reads `<SYNC_JOBHUNTER_DIR or CODE_ROOT/Job Hunter>/jobs/jobs.json`; mirror
  reconcile by `external_id`). Surfaced **read-only** at **`/jobs`** (KPI cards + status pipeline;
  `app/(app)/jobs/page.tsx` + `components/jobs/*`) and a compact **`job_hunter` tile**
  (`components/tiles/defs/job-hunter.tsx`). Jobs load via `loadDashboard` into `TileData.jobs`;
  KPI/pipeline/score logic mirrors the Job Hunter app (`lib/jobs.ts`). No editing/write-back
  (local-only, deferred). Status `Expired` (Job Hunter archives dead postings there) is a
  **terminal** status — migration `0011` adds it to the `jobs_status_check`; `JobStatus`,
  `JOB_STATUSES`/`TERMINAL`, and the badge map in `lib/jobs.ts` include it; the board renders
  `PIPELINE_STATUSES` (active only), so terminal statuses aren't columns. Keep these in lockstep
  with Job Hunter's status list.
- Next: **owner infra only** — optional GitHub/Steam tokens; add `SUPABASE_SERVICE_ROLE_KEY` to run
  the disk sync (see `BACKLOG.md`). No further code phases planned; do **not** start the SSO
  exploration without the user's go-ahead.

The user provisions Supabase project, Google OAuth, env vars, and applies the migration (§9).
`npm run build` and the preview MCP both pass against the current code.
