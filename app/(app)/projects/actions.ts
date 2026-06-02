"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ProjectStatus } from "@/lib/types";
import { isProjectStatus } from "@/lib/projects";

export type ProjectActionResult = { error?: string };

export type ProjectInput = {
  name: string;
  description?: string;
  status?: string;
  current_focus?: string;
  repo_url?: string;
  live_url?: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, user };
}

/** Trim to a non-empty string or null (so empty inputs clear the column). */
function clean(value?: string): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
}

function normalizeStatus(value?: string): ProjectStatus {
  return isProjectStatus(value) ? value : "active";
}

function fields(input: ProjectInput) {
  return {
    name: input.name.trim(),
    description: clean(input.description),
    status: normalizeStatus(input.status),
    current_focus: clean(input.current_focus),
    repo_url: clean(input.repo_url),
    live_url: clean(input.live_url),
  };
}

export async function createProject(
  input: ProjectInput,
): Promise<ProjectActionResult> {
  if (!input.name?.trim()) return { error: "Name is required." };
  try {
    const { supabase, user } = await requireUser();
    // Give each new project a distinct, increasing sort_order so reorder works.
    const { data: last } = await supabase
      .from("projects")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.sort_order ?? -1) + 1;

    const { error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, sort_order: nextOrder, ...fields(input) });
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create project." };
  }
  revalidatePath("/projects");
  return {};
}

export async function updateProject(
  id: string,
  input: ProjectInput,
): Promise<ProjectActionResult> {
  if (!input.name?.trim()) return { error: "Name is required." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("projects")
      .update(fields(input))
      .eq("id", id);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update project." };
  }
  revalidatePath("/projects");
  return {};
}

export async function deleteProject(id: string): Promise<ProjectActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return { error: error.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete project." };
  }
  revalidatePath("/projects");
  return {};
}

export async function moveProject(
  id: string,
  direction: "up" | "down",
): Promise<ProjectActionResult> {
  try {
    const { supabase } = await requireUser();
    const { data: rows, error } = await supabase
      .from("projects")
      .select("id, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) return { error: error.message };
    if (!rows) return {};

    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return { error: "Project not found." };
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= rows.length) return {}; // already at the end

    const current = rows[index];
    const neighbor = rows[swapWith];
    const [a, b] = await Promise.all([
      supabase
        .from("projects")
        .update({ sort_order: neighbor.sort_order })
        .eq("id", current.id),
      supabase
        .from("projects")
        .update({ sort_order: current.sort_order })
        .eq("id", neighbor.id),
    ]);
    const swapError = a.error ?? b.error;
    if (swapError) return { error: swapError.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reorder." };
  }
  revalidatePath("/projects");
  return {};
}
