"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PromptActionResult = { error?: string };

async function setHidden(id: string, hidden: boolean): Promise<PromptActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated." };

    // RLS already scopes to the owner; eq("id") targets the one row.
    const { error } = await supabase
      .from("prompts")
      .update({ hidden })
      .eq("id", id);
    if (error) return { error: error.message };

    revalidatePath("/prompts");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update prompt." };
  }
}

// Soft-delete: hide a prompt from the tab. Survives `npm run sync` (the mirror keeps the row and
// never writes `hidden`), so it won't reappear. Reversible via restorePrompt.
export async function hidePrompt(id: string): Promise<PromptActionResult> {
  return setHidden(id, true);
}

export async function restorePrompt(id: string): Promise<PromptActionResult> {
  return setHidden(id, false);
}
