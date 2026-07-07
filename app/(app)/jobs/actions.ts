"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { JobStatus } from "@/lib/types";
import { JOB_STATUSES } from "@/lib/jobs";

export type JobActionResult = { error?: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return { supabase, user };
}

// Every board edit to a pipeline field also sets board_dirty = true. The disk sync
// (scripts/sync-from-disk.mjs) reads that flag: it pushes the board's pipeline values back
// into Job Hunter's jobs.json (via tracker.py) and only then clears the flag — so a board
// edit is never silently clobbered by the next `npm run sync`. RLS scopes to the owner;
// eq("id") targets the one row.
async function patchJob(
  id: string,
  patch: Record<string, unknown>,
): Promise<JobActionResult> {
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase
      .from("jobs")
      .update({ ...patch, board_dirty: true })
      .eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/jobs");
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update job." };
  }
}

/** Move a job to any status (drag-to-column or the per-card menu). */
export async function setJobStatus(
  id: string,
  status: JobStatus,
): Promise<JobActionResult> {
  if (!JOB_STATUSES.includes(status)) return { error: `Invalid status: ${status}` };
  return patchJob(id, { status });
}

/** One-click apply: mark Applied and stamp today's date (the UI also opens the posting). */
export async function markApplied(id: string): Promise<JobActionResult> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (date-only column)
  return patchJob(id, { status: "Applied", date_applied: today });
}

/** Set the free-text "next action" reminder (empty clears it). */
export async function setNextAction(
  id: string,
  text: string,
): Promise<JobActionResult> {
  const v = text.trim();
  return patchJob(id, { next_action: v.length ? v : null });
}

// Tailored docs live in the private `job-docs` bucket (migration 0019), uploaded by the
// local `npm run sync` as job-docs/<external_id>/<file>. Reads are RLS-gated to allowlisted
// users, so a short-lived signed URL from the user's own session is the whole download story.
const JOB_DOC_FILES = {
  resume: "resume.docx",
  cover: "cover-letter.docx",
} as const;
// What the browser saves the file as — this is the filename the ATS receives, so it
// follows the Firstname-Lastname convention, not the internal JH id.
const JOB_DOC_DOWNLOAD_NAMES = {
  resume: "Robert-Green-Resume.docx",
  cover: "Robert-Green-Cover-Letter.docx",
} as const;
export type JobDocKind = keyof typeof JOB_DOC_FILES;

/** Signed download URL (60s) for a tailored job's resume/cover letter. */
export async function getJobDocUrl(
  externalId: string,
  kind: JobDocKind,
): Promise<{ url?: string; error?: string }> {
  const file = JOB_DOC_FILES[kind];
  if (!file) return { error: "Unknown document type." };
  if (!/^[A-Za-z0-9_-]+$/.test(externalId)) return { error: "Invalid job id." };
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase.storage
      .from("job-docs")
      .createSignedUrl(`${externalId}/${file}`, 60, {
        download: JOB_DOC_DOWNLOAD_NAMES[kind],
      });
    if (error) return { error: error.message };
    return { url: data.signedUrl };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create link." };
  }
}

/** Append a dated note. Reads-then-writes so existing history is preserved. */
export async function addNote(id: string, text: string): Promise<JobActionResult> {
  const note = text.trim();
  if (!note) return {};
  try {
    const { supabase } = await requireUser();
    const { data: cur, error: readErr } = await supabase
      .from("jobs")
      .select("notes")
      .eq("id", id)
      .maybeSingle();
    if (readErr) return { error: readErr.message };
    const existing = (cur?.notes ?? "").trim();
    const dated = `[${new Date().toISOString().slice(0, 10)}] ${note}`;
    const merged = existing ? `${existing}\n${dated}` : dated;
    return patchJob(id, { notes: merged });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to add note." };
  }
}
