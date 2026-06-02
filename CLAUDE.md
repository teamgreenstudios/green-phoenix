@AGENTS.md

# Personal Dashboard

Source of truth for the build: `dashboard-spec.md`. Single-user "launcher + cockpit"
with an extensible tile system. Scoped one **Phase** at a time (see spec §10); build in
**milestones and pause** after each so the user can run it.

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
- Email allowlist is enforced in `proxy.ts` (`lib/auth.ts#isAllowedEmail`). The DB helper
  `is_allowed_user()` exists in the migration but is **not** wired into RLS policies (policies
  are owner-only `auth.uid() = user_id`); the AND-clause is commented in `0001_init.sql`.

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
- Next: **owner infra only** — M4 Vercel deploy (see `BACKLOG.md`).
  No further code phases are planned; do **not** start the SSO exploration without the user's go-ahead.

The user provisions Supabase project, Google OAuth, env vars, and applies the migration (§9).
`npm run build` and the preview MCP both pass against the current code.
