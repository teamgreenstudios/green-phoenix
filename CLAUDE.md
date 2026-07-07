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
- **Local dev login needs a *secure origin*.** Supabase auth uses PKCE, whose code-challenge
  needs `crypto.subtle` — browsers only expose that on `https://` or `localhost`, **never a bare
  `http://<IP>`**. So Google "does nothing" when you hit the dev server at `http://10.x:3000` or a
  Tailscale IP. From another machine, either SSH-forward (`ssh -L 3000:localhost:3000 box` → browse
  `http://localhost:3000`) or serve it over HTTPS (`tailscale serve --https=443 http://127.0.0.1:3000`
  → the `*.ts.net` URL). Whatever origin you open must also be in Supabase → Auth → URL Config →
  **Redirect URLs** (the app builds `redirectTo` from `window.location.origin`).
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

## Status

All planned build phases are **complete** (scaffold → tiles → glanceables → jobs/transcripts/
prompts mirrors → hardening). What remains is **owner infra only**: optional `GITHUB_TOKEN` /
`STEAM_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` locally to run the disk sync (see `BACKLOG.md`).
No further code phases planned; do **not** start the SSO exploration (spec §11, intentionally
skipped) without the user's go-ahead. The user provisions Supabase, Google OAuth, env vars, and
applies migrations (spec §9). `npm run build` and the preview MCP both pass against current code.

**Apply new migrations before deploying** — a page that selects a brand-new column renders an
empty list (no error) when the column is absent; this bit deploys repeatedly (the `0015`–`0019`
episodes).

## App shell, auth & access

- Scaffold + base schema in `supabase/migrations/0001_init.sql`; shared authenticated
  `app/(app)/layout.tsx` (auth guard + header w/ `MainNav`); Google + magic-link auth,
  `/auth/callback`, `/not-authorized`; dark theme default.
- **The access lock is the email allowlist, enforced twice**: in `proxy.ts`
  (`lib/auth.ts#isAllowedEmail`, env `ALLOWED_EMAILS`) **and** in the DB —
  `public.is_allowed_user()` is AND-ed into every RLS policy on all six user-data tables
  (`projects`/`todos`/`tiles`/`boards`/`habits`/`habit_entries`, migration `0005`). The DB list
  is **hardcoded in the function** (deviation from spec §5: the MCP/pooler role lacks
  `ALTER DATABASE` for a GUC) — keep it in sync with `ALLOWED_EMAILS` (proxy.ts + Vercel env).
  Current allowlist: `robgreen31@gmail.com`, `robgreen31+dash@gmail.com`,
  `teamgreenstudios@gmail.com`.
- Hardening applied: FK covering indexes (`0006`), RLS initplan `(select …)` wrapping (`0007`).
  The `public` schema is clear of WARN-level Supabase advisors.

## Projects & todos

- Projects CRUD at `/projects` (list/create/edit/delete/reorder/status/current_focus) via
  Server Actions in `app/(app)/projects/actions.ts` (RLS-scoped); per-project detail at
  `/projects/[id]` (card titles link to it).
- Reusable client `components/todos/TodoList` (add/toggle/edit/delete/reorder, due date,
  priority, **tags** + filter, `completed_at`) over `app/(app)/todos/actions.ts`. Surfaces:
  global `/todos` + the project detail page.
- **Supabase realtime**: reusable `lib/hooks/use-realtime.ts`; `TodoList` merges live todo
  changes by id; `components/projects/realtime-projects.tsx` does `router.refresh()` on
  `/projects` + `/projects/[id]`. Replication is enabled on `todos`/`projects` and verified
  end-to-end — the hook calls `supabase.realtime.setAuth` so RLS `postgres_changes` include
  row data (fix `564c008`).

## Tile system & dashboards

- Registry (`components/tiles/registry.ts`) + per-type defs in `components/tiles/defs/*`
  (renderer + config form + meta). Renderer contract includes `id` + `onConfigSaved` (inline
  save) and `refreshable` + `refreshNonce` (generic per-tile refresh; button in `TileCard`).
- `TileBoard` (client edit mode: add/resize S-M-L/hide/edit/delete; edit toggle lives on the
  dashboard, not the global header) + `TileCard`; tile Server Actions in
  `app/(app)/tiles/actions.ts`. Drag-and-drop reorder via **dnd-kit** (grip handle in edit
  mode; `reorderTiles` writes `sort_order`; resize stays on the S/M/L buttons).
- Tile types: `launcher`, `todos`, `project-status`, `bookmarks`, `notes` (markdown via
  `react-markdown` + `rehype-sanitize` + `remark-gfm`, **inline-editable on the tile**),
  `weather` (Open-Meteo), `pomodoro`, `countdown`, **Today**, **activity heatmap**, `habits`,
  `job_hunter`, and **GitHub/Steam** data tiles (`defs/github.tsx` + live fetches in
  `tiles/data-sources.ts`, graceful without tokens). `media` remains a **stub** on the shared
  `defs/data-source-tile.tsx` scaffold (no live integration). Shared config-form helpers in
  `components/tiles/config-fields.tsx` (`Field`, `LinkItemsEditor`).
- **Multiple dashboards**: `boards` + `tiles.board_id` (`lib/load-dashboard.ts`, route
  `/b/[boardId]`, `components/{board-tabs,dashboard-view}.tsx`); tiles are board-scoped,
  projects/todos global. Migration `0004_phase4.sql`.
- App-wide extras: ⌘K **command palette + search** (`cmdk`; `components/command-palette.tsx`);
  **accent picker** (`data-accent` overrides in `globals.css` + a no-flash inline script in the
  root layout; light `--primary`/`--ring` darkened to `oklch(0.52 0.13 159)` for WCAG AA);
  tile **export/import** (account menu); **habit tracker** (`app/(app)/habits/`,
  `defs/habits.tsx`); **PWA** (`app/manifest.ts`, `public/{icon.svg,sw.js}`, viewport
  themeColor) + mobile-overflow polish.

## Disk sync (`npm run sync` — the workspace hub)

- `scripts/sync-from-disk.mjs` (`-- --dry-run` to preview) mirrors the folders under
  `SYNC_CODE_ROOT` (default `/home/robgreen/projects`) into `projects` (one per folder, keyed
  by `projects.external_path`, migration `0008`) and each folder's `BACKLOG.md` **GFM
  checkboxes** into that project's `todos` (tagged `disk-sync`). MIRROR mode: vanished folders
  → project archived, removed checkboxes → todo deleted; manual rows untouched. Runs **locally
  only** (a Vercel server can't read your disk) and writes via the **service-role key**
  (`SUPABASE_SERVICE_ROLE_KEY` in `.env.local`) for `SYNC_USER_EMAIL`. No new npm deps.
- The same run also mirrors **Job Hunter jobs** (two-way — see Jobs below), **instascrape
  transcripts + prompts** (see below), and uploads **job docs** to Storage.

## Jobs (`/jobs` board + two-way Job Hunter sync)

- **Mirror**: Job Hunter's `jobs/jobs.json` → `jobs` table (migration `0010`; reads
  `<SYNC_JOBHUNTER_DIR or CODE_ROOT/Job Hunter>/jobs/jobs.json`; mirror reconcile by
  `external_id`). Surfaced at **`/jobs`** (KPI cards + pipeline; `app/(app)/jobs/page.tsx` +
  `components/jobs/*`) and the compact `job_hunter` tile. Jobs load via `loadDashboard` into
  `TileData.jobs`; KPI/pipeline/score logic mirrors the Job Hunter app (`lib/jobs.ts`).
- **Statuses**: `Expired` (Job Hunter archives dead postings there) is **terminal** — migration
  `0011` adds it to `jobs_status_check`; `JobStatus`, `JOB_STATUSES`/`TERMINAL`, and the badge
  map in `lib/jobs.ts` include it; the board renders `PIPELINE_STATUSES` (active only), so
  terminal statuses aren't columns. Keep these in lockstep with Job Hunter's status list
  **and** the sync's local `JOB_STATUSES` array in `scripts/sync-from-disk.mjs` (which once
  omitted `Expired`).
- **Interactive board (migration `0018`)**: `components/jobs/jobs-board.tsx` is a
  `"use client"` dnd-kit kanban — drag a card between columns, per-card ⋯ menu, an **Apply**
  button (open posting + mark Applied), a **Tailor…** dialog with a copyable
  `/tailor-application <JH-id>` command, Resume/Cover-letter badges, and a collapsible
  Archived row. Edits go through Server Actions in `app/(app)/jobs/actions.ts`
  (`setJobStatus`/`markApplied`/`setNextAction`/`addNote`), each setting `board_dirty = true`.
- **Two-way rule**: the sync splits jobs columns into `SCOUTING_FIELDS` (always disk→DB) and
  `PIPELINE_FIELDS` (`status`/`date_applied`/`next_action`/`notes`, board-co-owned). A
  `board_dirty` row is **written back** into Job Hunter's `jobs.json` via
  `python3 <JobHunter>/scripts/tracker.py set-pipeline …` (then the flag clears); otherwise
  disk wins. Conflict rule = **board-wins** on the same row between two syncs. Scouting cols
  `has_resume`/`has_cover_letter` are derived by statting
  `applications/<application_folder>/{resume,cover-letter}.docx`. Note: the sync now **writes**
  a sibling repo (needs `python3` + `openpyxl` locally), and board edits reach Job Hunter /
  the 4317 dashboard / `tracker.xlsx` only after a sync.
- **Doc downloads (migration `0019`)**: the Resume/Cover-letter badges are **download
  buttons**. The sync uploads each tailored job's
  `applications/<folder>/{resume,cover-letter}.{docx,pdf}` into the **private `job-docs`
  bucket** (`job-docs/<external_id>/<file>`, service-role upload; skips files whose remote
  `updated_at` ≥ local mtime; "N docs uploaded" in the summary). Reads are RLS-gated on
  `storage.objects` via `public.is_allowed_user()` — deliberate, because the **guest job board
  shares this Supabase project** and must not see Rob's docs. `getJobDocUrl` in
  `app/(app)/jobs/actions.ts` mints a 60s signed URL (`download:` sets content-disposition —
  the saved filename is `Robert-Green-Resume.docx`/`Robert-Green-Cover-Letter.docx`, the
  Firstname-Lastname convention ATSs expect, not the internal JH id); the client clicks a
  transient `<a>`. Docs appear on the deployed board only after a local sync has uploaded them.

## Transcripts & prompts (instascrape mirrors)

- **Transcripts (read-only, migration `0012`)**: instascrape's
  `data/assets/research/<shortcode>/transcript.txt` → `transcripts` table (reads
  `<SYNC_INSTASCRAPE_DIR or CODE_ROOT/instascrape>/data/assets/research/*`; reconcile by
  `external_id` = the reel shortcode; `content` is the change signal). Surfaced at
  **`/transcripts`** (list) + **`/transcripts/[id]`** (viewer; `(audio)`/`(screen)` lines
  parsed + styled in `components/transcripts/transcript-view.tsx`). `Transcript` type in
  `lib/types.ts`. No write-back; same local-only sync model as jobs.
- **Prompts (mirror + soft-delete, migrations `0016`/`0017`)**: instascrape's
  `<shortcode>/prompts.json` → `prompts` table (MANY per post, key
  `external_id="<shortcode>#<index>"`). Surfaced at **`/prompts`**
  (`components/prompts/prompts-browser.tsx`: category/tool/tag filters + search + per-prompt
  Copy). **Delete = soft-delete**: a `hidden` boolean flagged via Server Actions in
  `app/(app)/prompts/actions.ts` (`hidePrompt`/`restorePrompt`); the browser filters it out
  and offers a "Show hidden (N)" → Restore view. `hidden` **survives the sync** — the mirror
  keeps the row (never re-inserted) and its update path writes only mirrored columns, never
  `hidden`, so the sync needed no changes.

## Code health

- **Lint (react-hooks v6 / compiler rules)**: the mount-guard idiom (`useState(false)` +
  `useEffect(() => setMounted(true))`) is replaced by `lib/hooks/use-mounted.ts`
  (`useSyncExternalStore`, no state-in-effect). Intentional timer/fetch/dialog-seed effects
  carry a targeted `// eslint-disable-next-line react-hooks/set-state-in-effect` (house
  style, same as the existing `exhaustive-deps` disables). `npm run lint` is green.
