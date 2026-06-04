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
  /** Absolute folder path when managed by the disk-sync script; null for manual projects (migration 0008). */
  external_path: string | null;
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
  tags: string[];
  completed_at: string | null; // set when done flips true (Phase 4)
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Habit tracker (Phase 4).
export interface Habit {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
export interface HabitEntry {
  id: string;
  user_id: string;
  habit_id: string;
  day: string; // ISO date (YYYY-MM-DD)
  created_at: string;
}

// Multiple dashboards (Phase 4). Only tiles are board-scoped; projects/todos are global.
export interface Board {
  id: string;
  user_id: string;
  name: string;
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
  | "bookmarks" // Phase 2
  | "steam" // Phase 2 (data-source stub)
  | "media"; // Phase 2 (data-source stub)

export interface Tile<Config = Record<string, unknown>> {
  id: string;
  user_id: string;
  board_id: string | null; // Phase 4: which dashboard board this tile belongs to
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

export interface NotesConfig {
  markdown: string;
}

// Data-source tiles (Phase 2): placeholder configs for not-yet-wired integrations.
export interface SteamConfig {
  steamId?: string;
}
export interface MediaConfig {
  libraryUrl?: string;
}
export interface GithubConfig {
  username?: string;
}

// Glanceable tiles (Phase 4).
export interface CountdownConfig {
  label?: string;
  targetDate?: string; // ISO date or datetime
}
export interface PomodoroConfig {
  workMin?: number;
  breakMin?: number;
}
export interface WeatherConfig {
  place?: string;
  lat?: number;
  lon?: number;
  unit?: "celsius" | "fahrenheit";
}
