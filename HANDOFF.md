# Personal Dashboard — Session Handoff

Continuity notes for picking this up in a new session. Read alongside:
- **`dashboard-spec.md`** — source of truth for the build (stack, schema, auth, tile contract, phasing).
- **`CLAUDE.md`** — auto-loads each session; per-milestone status + the stack gotchas. **Read it first.**

---

## Where things stand

- **Phase 1 (MVP) is complete and merged to `main`.** Commits: `838433f` (M0–M1), `3c7adc7` (M2),
  `d838daa` (M3). `npm run build` is green.
- **Phase 2 (more tiles & polish) is complete and merged to `main`.** Commits: `d331d71`
  (bookmarks), `0fb231b` + `0d77b10` (notes + GFM), `c2fd206` (steam/media stubs + per-tile refresh),
  `dd9bd78` (config-form polish + light-mode pass). No new migration. `npm run build` is green.
- **Phase 3 (drag-and-drop + realtime) is complete and merged to `main`.** Commits: `c3b493b`
  (dnd-kit tile reorder), `77adc1e` (Supabase realtime wiring), `564c008` (realtime auth fix).
  `npm run build` is green. Cross-app **SSO was intentionally skipped** (spec §11). Realtime is
  **live and verified** — replication is enabled on `todos`/`projects`, and the hook authenticates
  the socket (`setAuth`) so RLS `postgres_changes` include row data.
- **Phase 4 (feature expansion) is complete and merged to `main`.** 16 features across 10
  milestones: glanceable tiles (weather/pomodoro/countdown), ⌘K command palette + search (`cmdk`),
  accent picker, export/import, todo tags, Today + activity-heatmap tiles, habit tracker, multiple
  dashboards (boards), live GitHub/Steam tiles, and PWA + mobile polish. Migration `0004_phase4.sql`
  applied. `npm run build` is green.
- **DB migrations `0001`–`0009` are applied** to the Supabase project (ref `lxxhprumtvzwpbhkcphd`).
  `0005` AND-ed `is_allowed_user()` into all RLS policies (DB-level email allowlist, hardcoded
  list — not a GUC; see CLAUDE.md); `0006` added FK covering indexes; `0007` wrapped the policies'
  auth calls in `(select …)` (initplan perf); `0008` added `projects.external_path` for the disk
  sync; `0009` granted `service_role` DML on the dashboard tables (0002 only granted
  `authenticated`, so the sync's secret key hit "permission denied" until this). The dashboard's
  `public` schema is now clear of WARN-level Supabase advisors.
- **Disk sync (local CLI):** `scripts/sync-from-disk.mjs` / `npm run sync` (`-- --dry-run` previews
  with no key). Folders under `SYNC_CODE_ROOT` → projects; `BACKLOG.md` GFM checkboxes → todos.
  Local-only, service-role auth. Needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (BACKLOG §5).
- **Owner action items live in `BACKLOG.md`:** only optional GitHub/Steam tile tokens
  (`GITHUB_TOKEN`/`STEAM_API_KEY`) remain. M4 Vercel deploy ✅, realtime replication ✅, and the
  DB-level email-allowlist hardening ✅ are all done.
- **M4 (Vercel deploy) is intentionally deferred** — no code work, pure infra (push to GitHub →
  import to Vercel → set the 3 env vars → add prod domain to Supabase Auth URL config).

---

## How the user likes to work (communication norms)

- **One milestone at a time, then PAUSE.** Don't barrel through phases. Each milestone ends with a
  working app and a short, scannable status update (tables / tight sections). The user replies with
  short directives ("yes", "merge", "continue").
- **Flag any deviation from the spec** explicitly, with the reasoning. (Examples that were accepted:
  edit-mode toggle on the dashboard instead of the global header; function-only DB allowlist;
  publishable key over anon.)
- **Verify before claiming done** — three layers: (1) `npm run build` green, (2) self-test the actual
  UI as the test user, (3) confirm persistence in Postgres via the Supabase MCP. The user values
  "I drove it and checked the DB," not "it should work."
- **Commit per milestone** with a descriptive multi-paragraph message ending in the
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer. Work on a branch; fast-forward
  `main` when the user says "merge".
- **The user owns infra** (Supabase project, Google OAuth, Vercel, env vars). Tell them exactly what's
  needed and when; don't assume you can do it for them. They connected an authorized Supabase MCP so
  you *can* do DB work — see below.

---

## Self-testing workflow (the efficiency unlock)

**Supabase MCP — `supabase-dashboard`** is connected and **authorized** for the project. Use it for
`list_tables`, `execute_sql` (read the DB to confirm persistence), `get_advisors`, and
`apply_migration` (only with the user's explicit OK — the auto-mode classifier blocks self-initiated
prod schema changes). NOTE: a second, **unauthorized** Supabase MCP (tool prefix `b5d5…`) also exists
and returns "permission denied" — ignore it; always use the `supabase-dashboard`-prefixed tools.

**Test user** for driving the authenticated UI yourself: `robgreen31+dash@gmail.com` (password in
`.env.local`, commented at the bottom). It's email-confirmed, in the **local** allowlist only, and its
data is RLS-isolated from the real account. Its project ("Spiel Stats") + sample todos/tiles persist
on purpose.

**To self-test the UI:**
1. Temporarily add a dev-only hook to `app/(auth)/login/page.tsx` that exposes the browser client:
   ```tsx
   useEffect(() => {
     if (process.env.NODE_ENV !== "production") {
       (window as unknown as { __sb?: ReturnType<typeof createClient> }).__sb = createClient();
     }
   }, []);
   ```
2. Start the dev server via the **Claude Preview MCP** (`preview_start` name `"dev"`; config in
   `.claude/launch.json`).
3. Navigate to `/login`, then `await window.__sb.auth.signInWithPassword({ email, password })` via
   `preview_eval`. (The browser session often persists across preview restarts — you may already be
   signed in; navigating to `/login` then bounces to `/`.)
4. Drive the UI with `preview_eval` DOM scripting; **confirm every result in the DB** via the MCP.
5. **Remove the dev hook before building/committing.** (It's `NODE_ENV`-gated so it never runs in prod,
   but keep it out of commits.)

**Gotchas observed:** `preview_screenshot` sometimes hangs/times out — fall back to `preview_eval`
DOM reads + DB checks (authoritative). Keep eval scripts short; long click+submit flows can stall the
CDP connection (the action usually still succeeds — verify via DB). To set a React-controlled input
from eval, use the native value setter + dispatch an `input` event.

**Real auth (the user's own login):** Google OAuth provider IS enabled; magic link works but Supabase's
built-in email is rate-limited; email confirmation is ON.

---

## Stack gotchas (condensed — full version in `CLAUDE.md`)

- Next.js 16: the root request guard is **`proxy.ts`** (not `middleware.ts`), exported function `proxy`.
- shadcn **v4 → Base UI** (`@base-ui/react`), **not Radix**: `render` prop (not `asChild`); `onClick`
  (not `onSelect`) on menu items; `Select` uses `value`/`onValueChange` + a `SelectValue` children
  render-function; `Checkbox` uses `checked`/`onCheckedChange`; `DropdownMenuTrigger render={<Button/>}`.
- lucide-react 1.x dropped brand icons (no `Github` → use `GitBranch`).
- Tailwind v4 (CSS config in `app/globals.css`). Dynamic classes must be **literal strings** (tile
  size spans live as literals in `components/tiles/registry.ts`).
- Auth checks use `getUser()` / `getClaims()`, never `getSession()`.
- Server Actions return `{ data?, error? }`; client components manage optimistic local state and toast
  on error (see projects/todos/tiles for the pattern).

---

## Key file map

```
proxy.ts                              # session refresh + email allowlist guard
lib/supabase/{server,client,middleware,env}.ts   # @supabase/ssr clients + updateSession helper
lib/auth.ts                           # isAllowedEmail (ALLOWED_EMAILS)
lib/types.ts                          # DB rows + tile config shapes
lib/{projects,todos}.ts               # status/priority metadata + helpers
lib/hooks/use-realtime.ts             # postgres_changes subscription hook (Phase 3)
app/(auth)/login, /auth/callback      # Google + magic-link auth
app/not-authorized                    # allowlist bounce page
app/(app)/layout.tsx                  # auth guard + header (MainNav, ⌘K, accent, theme, account)
app/(app)/page.tsx                    # default dashboard board (DashboardView)
app/(app)/projects, /projects/[id]    # projects CRUD + detail (with per-project todos)
app/(app)/todos                       # global todos
app/(app)/{projects,todos,tiles}/actions.ts   # RLS-scoped Server Actions
app/(app)/tiles/{actions,data-sources}.ts   # tile Server Actions (incl. reorderTiles, Phase 3) + data-source stub fetch
components/projects, components/todos  # ProjectCard/dialogs, TodoList (realtime merge)/item/edit
components/projects/realtime-projects.tsx    # router.refresh() on projects changes (Phase 3)
components/tiles/
  registry.ts                         # type → TileDefinition; SIZE spans
  types.ts                            # TileDefinition (refreshable) / renderer props (id, onConfigSaved, refreshNonce)
  config-fields.tsx                   # shared Field + LinkItemsEditor for config forms
  defs/{launcher,todos,project-status,bookmarks,notes,weather,pomodoro,countdown,today,heatmap,habits,github}.tsx
  defs/{steam,media}.tsx + defs/data-source-tile.tsx   # data sources; live GitHub/Steam fetch in tiles/data-sources.ts
  tile-board.tsx (dnd-kit DnD + board-aware), tile-card.tsx (drag handle), add-edit-tile-dialog.tsx
lib/load-dashboard.ts                 # board-aware loader for / and /b/[boardId] (Phase 4)
app/(app)/b/[boardId]                 # a specific dashboard board (Phase 4)
app/(app)/{boards,command,habits}/actions.ts   # board CRUD / palette search / habit CRUD (Phase 4)
components/{board-tabs,dashboard-view}.tsx      # board switcher + dashboard wrapper (Phase 4)
components/{command-palette,accent-picker,sw-register}.tsx   # ⌘K, accent picker, SW registrar (Phase 4)
app/manifest.ts + public/{icon.svg,sw.js}       # PWA manifest, icon, service worker (Phase 4)
supabase/migrations/000{1..7}_*.sql   # schema+RLS, grants, search_path, Phase 4, allowlist RLS, FK indexes, initplan
BACKLOG.md                            # owner action items (enable replication, M4 deploy, optional hardening)
```

---

## Phase 2 (spec §10) — DONE

- [x] `bookmarks` tile renderer (compact link list; shares `LinkItemsEditor` with launcher)
- [x] `notes` (markdown) tile renderer — **inline-editable on the tile**; `react-markdown` +
      `rehype-sanitize` + `remark-gfm` (tables/strikethrough/task lists). Prose styled with scoped
      Tailwind variants over theme tokens (no typography-plugin dep).
- [x] Placeholder data-source tiles `steam` / `media` (config + stub renderer; shared scaffold
      `components/tiles/defs/data-source-tile.tsx`; stub fetch `app/(app)/tiles/data-sources.ts`).
      **Stubs only** — no live integration yet.
- [x] Per-tile refresh (`refreshable` + `refreshNonce` on the tile contract; refresh button in
      `TileCard`), nicer config forms (shared `Field`/`LinkItemsEditor` in
      `components/tiles/config-fields.tsx`), light-mode pass (light `--primary`/`--ring` darkened to
      `oklch(0.52 0.13 159)` for WCAG AA white-on-primary + primary-on-white).

**Adding a tile type = no migration:** create `components/tiles/defs/<type>.tsx` exporting a
`TileDefinition` (Renderer + ConfigForm + meta), then add it to the array in
`components/tiles/registry.ts`. The config shape rides in the `tiles.config` jsonb column. The
renderer contract (`components/tiles/types.ts`) also carries `id` + optional `onConfigSaved` (tiles
that save their own config inline, e.g. notes) and `refreshNonce` (for `refreshable` defs). Wiring a
real Steam/media integration = replace the per-type branch in `data-sources.ts` (the renderer shape
already supports `ok`/`message`/`detail`/`fetchedAt`).

---

## Run / verify

- `npm run dev` (or Preview MCP `"dev"`). `npm run build` for typecheck + lint + compile.
- Env (`.env.local`, git-ignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  `ALLOWED_EMAILS` (+ commented test-user creds).
