"use server";

import { createClient } from "@/lib/supabase/server";
import type { Todo } from "@/lib/types";
import { isTodoPriority } from "@/lib/todos";

export type TodoActionResult<T = void> = { data?: T; error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, user };
}

export async function createTodo(input: {
  title: string;
  projectId?: string | null;
}): Promise<TodoActionResult<Todo>> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  try {
    const { supabase, user } = await requireUser();
    const projectId = input.projectId ?? null;

    // Next sort_order within this scope (global list, or this project's list).
    const base = supabase
      .from("todos")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1);
    const { data: last } = await (projectId === null
      ? base.is("project_id", null)
      : base.eq("project_id", projectId)
    ).maybeSingle();
    const nextOrder = (last?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("todos")
      .insert({
        user_id: user.id,
        project_id: projectId,
        title,
        sort_order: nextOrder,
      })
      .select("*")
      .single();
    if (error) return { error: error.message };
    return { data: data as Todo };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add todo." };
  }
}

export async function toggleTodo(
  id: string,
  done: boolean,
): Promise<TodoActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("todos").update({ done }).eq("id", id);
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update todo." };
  }
}

export async function updateTodo(
  id: string,
  input: {
    title: string;
    notes?: string | null;
    due_date?: string | null;
    priority?: number;
  },
): Promise<TodoActionResult<Todo>> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("todos")
      .update({
        title,
        notes: (input.notes ?? "").trim() || null,
        due_date: input.due_date || null,
        priority: isTodoPriority(input.priority) ? input.priority : 0,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { error: error.message };
    return { data: data as Todo };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update todo." };
  }
}

export async function deleteTodo(id: string): Promise<TodoActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete todo." };
  }
}

export async function moveTodo(
  id: string,
  direction: "up" | "down",
  scope: { projectId: string | null },
): Promise<TodoActionResult> {
  try {
    const { supabase } = await requireUser();
    const base = supabase
      .from("todos")
      .select("id, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    const { data: rows, error } = await (scope.projectId === null
      ? base.is("project_id", null)
      : base.eq("project_id", scope.projectId));
    if (error) return { error: error.message };
    if (!rows) return {};

    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return { error: "Todo not found." };
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= rows.length) return {};

    const current = rows[index];
    const neighbor = rows[swapWith];
    const [a, b] = await Promise.all([
      supabase
        .from("todos")
        .update({ sort_order: neighbor.sort_order })
        .eq("id", current.id),
      supabase
        .from("todos")
        .update({ sort_order: current.sort_order })
        .eq("id", neighbor.id),
    ]);
    const swapError = a.error ?? b.error;
    if (swapError) return { error: swapError.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reorder." };
  }
}
