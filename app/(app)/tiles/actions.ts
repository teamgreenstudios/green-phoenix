"use server";

import { createClient } from "@/lib/supabase/server";
import type { Tile, TileSize } from "@/lib/types";

export type TileActionResult<T = void> = { data?: T; error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, user };
}

function normalizeSize(size?: string): TileSize {
  return size === "S" || size === "M" || size === "L" ? size : "M";
}

export async function createTile(input: {
  type: string;
  title?: string | null;
  config?: unknown;
  size?: string;
}): Promise<TileActionResult<Tile>> {
  const type = (input.type ?? "").trim();
  if (!type) return { error: "Tile type is required." };
  try {
    const { supabase, user } = await requireUser();
    const { data: last } = await supabase
      .from("tiles")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("tiles")
      .insert({
        user_id: user.id,
        type,
        title: (input.title ?? "").trim() || null,
        config: (input.config ?? {}) as object,
        size: normalizeSize(input.size),
        sort_order: nextOrder,
        visible: true,
      })
      .select("*")
      .single();
    if (error) return { error: error.message };
    return { data: data as Tile };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add tile." };
  }
}

export async function updateTile(
  id: string,
  input: {
    title?: string | null;
    config?: unknown;
    size?: string;
    visible?: boolean;
  },
): Promise<TileActionResult<Tile>> {
  try {
    const { supabase } = await requireUser();
    const patch: Record<string, unknown> = {};
    if (input.title !== undefined) patch.title = (input.title ?? "").trim() || null;
    if (input.config !== undefined) patch.config = input.config as object;
    if (input.size !== undefined) patch.size = normalizeSize(input.size);
    if (input.visible !== undefined) patch.visible = input.visible;
    if (Object.keys(patch).length === 0) return {};

    const { data, error } = await supabase
      .from("tiles")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return { error: error.message };
    return { data: data as Tile };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update tile." };
  }
}

export async function deleteTile(id: string): Promise<TileActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("tiles").delete().eq("id", id);
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to delete tile." };
  }
}

export async function moveTile(
  id: string,
  direction: "up" | "down",
): Promise<TileActionResult> {
  try {
    const { supabase } = await requireUser();
    const { data: rows, error } = await supabase
      .from("tiles")
      .select("id, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) return { error: error.message };
    if (!rows) return {};

    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return { error: "Tile not found." };
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= rows.length) return {};

    const current = rows[index];
    const neighbor = rows[swapWith];
    const [a, b] = await Promise.all([
      supabase
        .from("tiles")
        .update({ sort_order: neighbor.sort_order })
        .eq("id", current.id),
      supabase
        .from("tiles")
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

/**
 * Persist a full drag-and-drop reordering: write sort_order = array index for
 * each tile id, in the given order. RLS scopes every update to the user's rows.
 */
export async function reorderTiles(
  orderedIds: string[],
): Promise<TileActionResult> {
  try {
    const { supabase } = await requireUser();
    const results = await Promise.all(
      orderedIds.map((id, i) =>
        supabase.from("tiles").update({ sort_order: i }).eq("id", id),
      ),
    );
    const failed = results.find((r) => r.error)?.error;
    if (failed) return { error: failed.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to reorder." };
  }
}
