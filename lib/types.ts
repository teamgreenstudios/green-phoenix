/**
 * Shared types: database rows (mirroring supabase/migrations/0001_init.sql) and the
 * per-type tile config shapes from the tile contract (spec §6).
 *
 * These are hand-written for now. Once the migration is applied, they can be replaced
 * or augmented with generated types (`supabase gen types typescript`).
 */

// ---- Database rows ---------------------------------------------------------

export type ProjectStatus =
  | "idea"
  | "active"
  | "paused"
  | "shipped"
  | "archived";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  repo_url: string | null;
  live_url: string | null;
  status: ProjectStatus;
  current_focus: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** 0 none, 1 low, 2 med, 3 high */
export type TodoPriority = 0 | 1 | 2 | 3;

export interface Todo {
  id: string;
  user_id: string;
  project_id: string | null; // null => global todo
  title: string;
  notes: string | null;
  done: boolean;
  due_date: string | null; // ISO date (YYYY-MM-DD)
  priority: TodoPriority;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type TileSize = "S" | "M" | "L";

/** Known tile types. `type` is stored as free text so new renderers need no migration. */
export type TileType =
  | "launcher"
  | "todos"
  | "project_status"
  | "notes" // Phase 2
  | "bookmarks"; // Phase 2

export interface Tile<Config = Record<string, unknown>> {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  config: Config;
  size: TileSize;
  sort_order: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Tile config shapes (spec §6) ------------------------------------------

export interface LauncherItem {
  label: string;
  url: string;
  icon?: string;
  color?: string;
}
export interface LauncherConfig {
  items: LauncherItem[];
}

export interface TodosTileConfig {
  scope: "global" | "project";
  project_id?: string;
  filter?: "open" | "all";
}

export interface ProjectStatusConfig {
  project_id?: string; // omit => all projects
}

export interface BookmarkItem {
  label: string;
  url: string;
}
export interface BookmarksConfig {
  items: BookmarkItem[];
}
