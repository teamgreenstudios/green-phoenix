# Personal Dashboard — Build Spec

A single-user personal dashboard that launches your web apps, tracks where you are on
each project, and holds todo lists (global + per-project). Built to be extended with new
"info tiles" over time without schema changes.

This document is the source of truth for the build. It is written to be handed directly
to Claude Code.

---

## 1. Goal & principles

- **Launcher + cockpit.** The dashboard links out to your apps; it does not host them.
- **Single user.** Only you log in. RLS + an email allowlist enforce this.
- **Extensible by config, not migration.** New tile types are new renderers reading a
  generic `jsonb` config — adding one should never require a DB change.
- **Clean, modern, dark-mode-first.** Calm, legible, fast.

---

## 2. Architecture: isolation

The dashboard is **its own Supabase project**, locked to you alone. It is fully isolated
from every app it links to.

- **Dashboard** → own Supabase project, own auth, single user (you).
- **Each app** (Spiel Stats, future travel map, etc.) → its own Supabase project, its own
  auth, its own users.
- **Launcher tiles are just URLs.** No shared database, no shared login, no coupling.

This keeps blast radius small (your personal data never sits in a project you hand to
other users), keeps each app independently shareable, and avoids entangling Spiel Stats'
existing project. Cross-app SSO is explicitly **out of scope** (revisit in Phase 3 only if
genuinely wanted).

---

## 3. Tech stack

| Layer    | Choice                                  | Notes                                        |
|----------|-----------------------------------------|----------------------------------------------|
| Framework| Next.js (App Router, TypeScript)        | Server Components + server actions default   |
| Hosting  | Vercel (Hobby tier)                     | Same place the other projects live           |
| Database | Supabase (Postgres)                     | New project, dashboard-only                  |
| Auth     | Supabase Auth — Google OAuth + magic link| Email allowlist guard (see §5)              |
| Styling  | Tailwind CSS                            | Dark mode default                            |
| UI kit   | shadcn/ui                               | Cards, dialogs, buttons, inputs, dropdowns   |
| Icons    | lucide-react                            |                                              |

Client components only where interactivity needs them (todos, edit mode, tile config
dialogs). Everything else stays a Server Component.

---

## 4. Data model

All tables carry `user_id` and are protected by RLS. Three tables cover the whole app.

```sql
-- Enable extension for gen_random_uuid() if not already on
create extension if not exists pgcrypto;

-- updated_at helper
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- PROJECTS ------------------------------------------------------------------
create table projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  repo_url      text,
  live_url      text,
  status        text not null default 'active'
                  check (status in ('idea','active','paused','shipped','archived')),
  current_focus text,                         -- "where am I / next step" free text
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();
create index on projects (user_id, sort_order);

-- TODOS ---------------------------------------------------------------------
-- project_id NULL  => global todo
-- project_id set   => belongs to that project
create table todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references projects(id) on delete cascade,
  title       text not null,
  notes       text,
  done        boolean not null default false,
  due_date    date,
  priority    int  not null default 0,        -- 0 none, 1 low, 2 med, 3 high
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger todos_updated_at before update on todos
  for each row execute function set_updated_at();
create index on todos (user_id, project_id, done, sort_order);

-- TILES ---------------------------------------------------------------------
-- Generic tile. `type` selects a renderer; `config` is shape-per-type.
create table tiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,                  -- 'launcher' | 'todos' | 'project_status' | 'notes' | 'bookmarks' | ...
  title       text,
  config      jsonb not null default '{}'::jsonb,
  size        text not null default 'M' check (size in ('S','M','L')),
  sort_order  int  not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger tiles_updated_at before update on tiles
  for each row execute function set_updated_at();
create index on tiles (user_id, visible, sort_order);
```

---

## 5. Auth & access control

Defense in depth — three layers:

**A. Email allowlist (the real lock).** RLS scoped to `user_id` only *isolates* users from
each other; it does not stop a stranger's Google account from completing the OAuth flow and
getting an empty dashboard. The allowlist is what actually keeps others out.

- Env var `ALLOWED_EMAILS` (comma-separated, lowercased).
- Next.js middleware: if there is a session and `session.user.email` is not in
  `ALLOWED_EMAILS`, sign the user out and show a plain "Not authorized" page.
- Optional DB hardening (recommended): a Postgres helper used inside policies so the lock
  also lives in the database:

```sql
create or replace function is_allowed_user()
returns boolean language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email','')) = any (
    string_to_array(lower(current_setting('app.allowed_emails', true)), ',')
  )
$$;
-- set the GUC once per project: alter database postgres set app.allowed_emails = 'you@example.com';
```

**B. RLS — owner-only on every table.**

```sql
alter table projects enable row level security;
alter table todos    enable row level security;
alter table tiles    enable row level security;

-- pattern repeated for each table (projects shown; duplicate for todos, tiles)
create policy "own rows - select" on projects
  for select using (auth.uid() = user_id);
create policy "own rows - insert" on projects
  for insert with check (auth.uid() = user_id);
create policy "own rows - update" on projects
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows - delete" on projects
  for delete using (auth.uid() = user_id);
```

If you adopt the DB allowlist from (A), AND `is_allowed_user()` into each `using` /
`with check` clause for belt-and-suspenders.

**C. Login methods.** Google OAuth (primary) + magic link (zero-config fallback). See §9 for
the Google Cloud + Supabase setup steps.

---

## 6. Tile contract

This is the extensibility core. Keep it strict so new tiles are cheap.

- A tile row = `{ type, title, config, size, sort_order, visible }`.
- `type` maps to exactly one **renderer** component via a registry:
  `const TILE_RENDERERS: Record<string, TileRenderer> = { ... }`.
- Each type owns a **TypeScript config type** and a small **config form** (used in the
  "add/edit tile" dialog). Unknown types render a graceful "Unknown tile type" fallback.
- `size` maps to grid column span: `S=1, M=2, L=3` (tune to the chosen grid).

**Starter tile types (Phase 1 unless noted):**

| type             | config shape                                                        | renders                                              |
|------------------|---------------------------------------------------------------------|------------------------------------------------------|
| `launcher`       | `{ items: [{ label, url, icon?, color? }] }`                        | Grid of app/link buttons. Starts empty; add manually.|
| `todos`          | `{ scope: 'global' \| 'project', project_id?, filter?: 'open'\|'all' }` | A todo list bound to global or one project.       |
| `project_status` | `{ project_id?: uuid }` (omit = all projects)                       | Status badge, current_focus, repo/live links.        |
| `notes`          | `{ markdown: string }`                                              | Rendered markdown scratchpad. *(Phase 2)*            |
| `bookmarks`      | `{ items: [{ label, url }] }`                                       | Compact link list. *(Phase 2)*                       |

**Adding a new type later** = write a renderer + config type + register it. No migration.
Steam library, searchable media list, GitHub activity, etc. all slot in here as future
"data-source" tiles.

---

## 7. UI / UX

- **Layout:** responsive CSS grid of tiles. Tile `size` → column span; `sort_order` → order.
- **Dark mode default**, with a light toggle. Calm palette, generous spacing, one accent color.
- **Edit mode** (toggle in header): reveals per-tile controls — change size (S/M/L), reorder
  (up/down buttons stepping `sort_order`), hide/show (`visible`), edit config, delete; plus an
  "Add tile" button. Outside edit mode the dashboard is clean and read-only-looking.
- **Header:** app title, edit-mode toggle, theme toggle, account menu (sign out).
- **Empty states** everywhere (no projects, no todos, no tiles) with a clear primary action.
- **Keyboard-friendly** todo entry (enter to add, click/space to toggle done).

Drag-and-drop is deliberately **not** in Phase 1 — `sort_order` is stored so it can be added
later (react-grid-layout) without rework.

---

## 8. Project structure (suggested)

```
app/
  (auth)/login/page.tsx
  (auth)/auth/callback/route.ts
  not-authorized/page.tsx
  page.tsx                      # dashboard (Server Component)
  projects/page.tsx             # projects CRUD
components/
  tiles/
    tile-grid.tsx
    tile-card.tsx               # chrome: title, size, edit controls
    registry.ts                 # type -> renderer + config form
    renderers/
      launcher-tile.tsx
      todos-tile.tsx
      project-status-tile.tsx
  todos/...
  ui/                           # shadcn components
lib/
  supabase/server.ts            # server client
  supabase/client.ts            # browser client
  types.ts                      # DB + tile config types
middleware.ts                   # session + allowlist guard
supabase/
  migrations/0001_init.sql      # §4 + §5 SQL
```

---

## 9. Setup steps (one-time)

1. **Create a new Supabase project** (separate from Spiel Stats). Note the URL + anon key.
2. **Run the migration** in §4 + §5 (SQL editor or `supabase db push`).
3. **Google OAuth:**
   - Google Cloud Console → new OAuth consent screen (External, just your email as test user).
   - Create OAuth client (Web). Authorized redirect URI:
     `https://<project-ref>.supabase.co/auth/v1/callback`.
   - Supabase → Auth → Providers → Google → paste Client ID + Secret, enable.
4. **Env vars** (`.env.local` and Vercel):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ALLOWED_EMAILS=you@example.com`
5. **(Optional DB allowlist)** `alter database postgres set app.allowed_emails = 'you@example.com';`
6. **Deploy to Vercel**, add the same env vars, set Supabase redirect URLs to the Vercel domain.

---

## 10. Phased checklist

**Phase 1 — MVP**
- [ ] Next.js + Tailwind + shadcn/ui scaffold, dark mode default
- [ ] Supabase clients (server/browser), migration applied, RLS on
- [ ] Auth: Google OAuth + magic link, callback route
- [ ] Middleware allowlist guard + `not-authorized` page
- [ ] Projects CRUD (list, create, edit, delete, reorder, status, current_focus)
- [ ] Todos: global + per-project; add, toggle done, edit, delete, reorder, due date, priority
- [ ] Tile system: registry, `tile-grid`, `tile-card`, edit mode (size/order/visible/delete/add)
- [ ] Renderers: `launcher`, `todos`, `project_status`
- [ ] Responsive grid, empty states, deployed to Vercel

**Phase 2 — more tiles & polish**
- [ ] `notes` (markdown) renderer
- [ ] `bookmarks` renderer
- [ ] Placeholder "data-source" tiles for Steam / media (config + stub renderer)
- [ ] Per-tile refresh, nicer config forms, light-mode pass

**Phase 3 — fancy**
- [ ] Drag-and-drop layout (react-grid-layout) writing back to `sort_order`/`size`
- [ ] Supabase realtime (live todo/project updates)
- [ ] (Only if wanted) cross-app SSO exploration

---

## 11. Out of scope (for now)

- Hosting any of the linked apps inside the dashboard.
- Multi-tenant / other users on the dashboard itself.
- Cross-app single sign-on.
- Drag-and-drop (Phase 3).
