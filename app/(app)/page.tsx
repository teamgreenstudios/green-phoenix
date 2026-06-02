import { createClient } from "@/lib/supabase/server";
import type { Project, Tile, Todo } from "@/lib/types";
import { TileBoard } from "@/components/tiles/tile-board";

export default async function DashboardPage() {
  const supabase = await createClient();
  // Load tiles plus the data they render (RLS scopes all of it to the user).
  const [tilesRes, projectsRes, todosRes] = await Promise.all([
    supabase
      .from("tiles")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<Tile[]>(),
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
  ]);

  return (
    <TileBoard
      initialTiles={tilesRes.data ?? []}
      data={{
        projects: projectsRes.data ?? [],
        todos: todosRes.data ?? [],
      }}
    />
  );
}
