import { createClient } from "@/lib/supabase/server";
import type { Board, Job, Project, Tile, Todo } from "@/lib/types";

export type DashboardData = {
  boards: Board[];
  currentBoard: Board | null;
  /** True when a specific board was requested but doesn't exist (→ notFound). */
  missing: boolean;
  tiles: Tile[];
  projects: Project[];
  todos: Todo[];
  jobs: Job[];
};

/**
 * Loads everything the dashboard renders for one board: the board list, the
 * current board's tiles, plus the global projects/todos (RLS-scoped). Ensures a
 * default board exists on first run. Used by both `/` and `/b/[boardId]`.
 */
export async function loadDashboard(boardId?: string): Promise<DashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const empty: DashboardData = {
    boards: [],
    currentBoard: null,
    missing: false,
    tiles: [],
    projects: [],
    todos: [],
    jobs: [],
  };
  if (!user) return empty;

  let boards =
    (
      await supabase
        .from("boards")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<Board[]>()
    ).data ?? [];

  // First-run safety: every user has at least one board.
  if (boards.length === 0) {
    const { data: created } = await supabase
      .from("boards")
      .insert({ user_id: user.id, name: "Dashboard", sort_order: 0 })
      .select("*")
      .single();
    if (created) boards = [created as Board];
  }

  const requested = boardId ? boards.find((b) => b.id === boardId) : undefined;
  const missing = !!boardId && !requested;
  const currentBoard = requested ?? boards[0] ?? null;

  const [projectsRes, todosRes, jobsRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<Project[]>(),
    supabase
      .from("todos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<Todo[]>(),
    supabase
      .from("jobs")
      .select("*")
      .order("match_score", { ascending: false, nullsFirst: false })
      .returns<Job[]>(),
  ]);

  let tiles: Tile[] = [];
  if (currentBoard) {
    tiles =
      (
        await supabase
          .from("tiles")
          .select("*")
          .eq("board_id", currentBoard.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
          .returns<Tile[]>()
      ).data ?? [];
  }

  return {
    boards,
    currentBoard,
    missing,
    tiles,
    projects: projectsRes.data ?? [],
    todos: todosRes.data ?? [],
    jobs: jobsRes.data ?? [],
  };
}
