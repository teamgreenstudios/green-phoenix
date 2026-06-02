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
- Next: M4 deploy (Vercel). Do **not** build Phase 2/3 features.

The user provisions Supabase project, Google OAuth, env vars, and applies the migration (§9).
`npm run build` and the preview MCP both pass against the M0 code.
