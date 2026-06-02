"use server";

import { createClient } from "@/lib/supabase/server";
import type { Habit, HabitEntry } from "@/lib/types";

export type HabitActionResult<T = void> = { data?: T; error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, user };
}

export async function loadHabits(): Promise<{
  habits: Habit[];
  entries: HabitEntry[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { habits: [], entries: [] };
  const [h, e] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase.from("habit_entries").select("*"),
  ]);
  return {
    habits: (h.data ?? []) as Habit[],
    entries: (e.data ?? []) as HabitEntry[],
  };
}

export async function createHabit(
  name: string,
): Promise<HabitActionResult<Habit>> {
  const n = name.trim();
  if (!n) return { error: "Name is required." };
  try {
    const { supabase, user } = await requireUser();
    const { data: last } = await supabase
      .from("habits")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.sort_order ?? -1) + 1;
    const { data, error } = await supabase
      .from("habits")
      .insert({ user_id: user.id, name: n, sort_order: nextOrder })
      .select("*")
      .single();
    if (error) return { error: error.message };
    return { data: data as Habit };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add habit." };
  }
}

export async function deleteHabit(id: string): Promise<HabitActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("habits").delete().eq("id", id);
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete habit." };
  }
}

/** Toggle a habit's completion for a given day (YYYY-MM-DD). */
export async function toggleHabitDay(
  habitId: string,
  day: string,
): Promise<HabitActionResult<{ done: boolean }>> {
  try {
    const { supabase, user } = await requireUser();
    const { data: existing } = await supabase
      .from("habit_entries")
      .select("id")
      .eq("habit_id", habitId)
      .eq("day", day)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("habit_entries")
        .delete()
        .eq("id", existing.id);
      if (error) return { error: error.message };
      return { data: { done: false } };
    }
    const { error } = await supabase
      .from("habit_entries")
      .insert({ user_id: user.id, habit_id: habitId, day });
    if (error) return { error: error.message };
    return { data: { done: true } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to toggle habit." };
  }
}
