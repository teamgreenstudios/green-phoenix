"use server";

import { createClient } from "@/lib/supabase/server";

export type CommandData = {
  projects: { id: string; name: string }[];
  todos: { id: string; title: string; project_id: string | null }[];
  notes: { id: string; title: string | null; text: string }[];
};

/**
 * Loads the user's searchable content for the ⌘K palette (RLS-scoped). Filtering
 * happens client-side in cmdk; this just supplies the candidate set.
 */
export async function loadCommandData(): Promise<CommandData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { projects: [], todos: [], notes: [] };

  const [projectsRes, todosRes, notesRes] = await Promise.all([
    supabase.from("projects").select("id, name").order("sort_order"),
    supabase.from("todos").select("id, title, project_id").order("created_at"),
    supabase.from("tiles").select("id, title, config").eq("type", "notes"),
  ]);

  const notes = (notesRes.data ?? []).map((t) => {
    const md = (t.config as { markdown?: string } | null)?.markdown ?? "";
    return { id: t.id as string, title: (t.title as string | null) ?? null, text: md.slice(0, 280) };
  });

  return {
    projects: (projectsRes.data ?? []) as CommandData["projects"],
    todos: (todosRes.data ?? []) as CommandData["todos"],
    notes,
  };
}
