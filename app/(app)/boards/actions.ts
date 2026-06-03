"use server";

import { createClient } from "@/lib/supabase/server";
import type { Board } from "@/lib/types";

export type BoardActionResult<T = void> = { data?: T; error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, user };
}

export async function createBoard(
  name: string,
): Promise<BoardActionResult<Board>> {
  const n = name.trim();
  if (!n) return { error: "Board name is required." };
  try {
    const { supabase, user } = await requireUser();
    const { data: last } = await supabase
      .from("boards")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.sort_order ?? -1) + 1;
    const { data, error } = await supabase
      .from("boards")
      .insert({ user_id: user.id, name: n, sort_order: nextOrder })
      .select("*")
      .single();
    if (error) return { error: error.message };
    return { data: data as Board };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add board." };
  }
}

export async function renameBoard(
  id: string,
  name: string,
): Promise<BoardActionResult<Board>> {
  const n = name.trim();
  if (!n) return { error: "Board name is required." };
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("boards")
      .update({ name: n })
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { error: error.message };
    return { data: data as Board };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to rename board." };
  }
}

/** Delete a board (its tiles cascade). Refuses to delete the user's last board. */
export async function deleteBoard(id: string): Promise<BoardActionResult> {
  try {
    const { supabase } = await requireUser();
    const { count } = await supabase
      .from("boards")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) <= 1) {
      return { error: "You need at least one board." };
    }
    const { error } = await supabase.from("boards").delete().eq("id", id);
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete board." };
  }
}
