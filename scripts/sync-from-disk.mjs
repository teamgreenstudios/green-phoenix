#!/usr/bin/env node
/**
 * Disk → dashboard sync (LOCAL ONLY).
 *
 * Mirrors the folders under SYNC_CODE_ROOT into the dashboard's `projects` table,
 * and each folder's BACKLOG.md GFM checkboxes into that project's `todos`.
 *
 *   - Each immediate sub-folder of the code root becomes a project
 *     (keyed by absolute path in projects.external_path, migration 0008).
 *   - In each folder's BACKLOG.md, lines like `- [ ] task` / `- [x] done` become
 *     todos (tagged `disk-sync`); `[x]` marks them complete.
 *   - Job Hunter's local jobs/jobs.json is mirrored (read-only) into the `jobs`
 *     table (migration 0010), keyed by external_id.
 *   - MIRROR reconciliation: synced projects whose folder is gone get ARCHIVED;
 *     synced todos whose checkbox is gone get DELETED. Manual projects/todos
 *     (no external_path / no `disk-sync` tag) are never touched.
 *
 * Why local-only: a Vercel server can't read your C:\ drive. This script runs on
 * your machine and writes to Supabase; the dashboard (local or prod) then displays it.
 *
 * Usage:
 *   npm run sync                 # apply changes
 *   npm run sync -- --dry-run    # print the plan, touch nothing (no key needed)
 *
 * Auth: SUPABASE_SERVICE_ROLE_KEY (server secret) + NEXT_PUBLIC_SUPABASE_URL, read
 * from .env.local. Writes rows for SYNC_USER_EMAIL (default robgreen31@gmail.com).
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DRY_RUN = process.argv.includes("--dry-run");
const SYNC_TAG = "disk-sync";
const DEFAULT_CODE_ROOT = "C:\\Users\\Rob\\Documents\\Claude\\Code";
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", ".vercel", "dist", "build"]);

// ── tiny .env.local loader (no dotenv dependency) ───────────────────────────
function loadEnvLocal() {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [join(process.cwd(), ".env.local"), join(here, "..", ".env.local")]) {
    if (!existsSync(candidate)) continue;
    for (const raw of readFileSync(candidate, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
    return; // first found wins
  }
}

// ── folder scan ─────────────────────────────────────────────────────────────
function listProjectFolders(root, ignore) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch (err) {
    console.error(`✖ Cannot read SYNC_CODE_ROOT: ${root}\n  ${err.message}`);
    process.exit(1);
  }
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !name.startsWith(".") && !SKIP_DIRS.has(name) && !ignore.has(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ name, path: join(root, name) }));
}

function findBacklog(folderPath) {
  try {
    const hit = readdirSync(folderPath).find((f) => f.toLowerCase() === "backlog.md");
    if (!hit) return null;
    const full = join(folderPath, hit);
    return statSync(full).isFile() ? full : null;
  } catch {
    return null;
  }
}

// ── BACKLOG.md → todos ───────────────────────────────────────────────────────
const CHECKBOX_RE = /^\s*[-*]\s+\[([ xX])\]\s+(.*\S)\s*$/;

function cleanInline(s) {
  return s.replace(/`/g, "").replace(/\*\*/g, "").trim();
}

function parseBacklog(file) {
  const todos = [];
  const seen = new Set();
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(CHECKBOX_RE);
    if (!m) continue;
    const done = m[1].toLowerCase() === "x";
    const text = m[2].trim();
    // Title = the bold lead if present (short, clean), else the whole line. We don't
    // capture trailing prose as notes: these bullets often soft-wrap to the next line,
    // so a same-line remainder is unreliable. Keep titles tidy; detail stays in the file.
    const bold = text.match(/^\*\*(.+?)\*\*/);
    let title = cleanInline(bold ? bold[1] : text);
    const notes = null;
    if (!title) continue;
    if (title.length > 300) title = title.slice(0, 297) + "…";
    const key = title.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue; // first occurrence wins within a file
    seen.add(key);
    todos.push({ title, notes, done, key });
  }
  return todos;
}

// ── Job Hunter jobs.json → jobs (read-only mirror) ───────────────────────────
const JOB_STATUSES = [
  "New",
  "Interested",
  "Tailored",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
  "Passed",
];
// Columns the sync owns (compared to decide insert vs update vs no-op).
const JOB_FIELDS = [
  "company",
  "title",
  "location",
  "remote",
  "source",
  "url",
  "match_score",
  "why_it_fits",
  "salary",
  "status",
  "date_found",
  "date_applied",
  "next_action",
  "notes",
  "application_folder",
];

function findJobsJson(codeRoot) {
  const dir = process.env.SYNC_JOBHUNTER_DIR
    ? resolve(process.env.SYNC_JOBHUNTER_DIR)
    : join(codeRoot, "Job Hunter");
  const file = join(dir, "jobs", "jobs.json");
  return existsSync(file) ? { dir, file } : null;
}

function parseJobs(file) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const clean = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return raw
    .filter((j) => j && j.id)
    .map((j) => {
      const score = Number(j.matchScore);
      return {
        external_id: String(j.id),
        company: clean(j.company),
        title: clean(j.title),
        location: clean(j.location),
        remote: clean(j.remote),
        source: clean(j.source),
        url: clean(j.url),
        match_score: Number.isFinite(score) ? score : null,
        why_it_fits: clean(j.whyItFits),
        salary: clean(j.salary),
        status: JOB_STATUSES.includes(j.status) ? j.status : "New",
        date_found: clean(j.dateFound),
        date_applied: clean(j.dateApplied),
        next_action: clean(j.nextAction),
        notes: clean(j.notes),
        application_folder: clean(j.applicationFolder),
      };
    });
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  loadEnvLocal();
  const codeRoot = resolve(process.env.SYNC_CODE_ROOT || DEFAULT_CODE_ROOT);
  const ignore = new Set(
    (process.env.SYNC_IGNORE || "").split(",").map((s) => s.trim()).filter(Boolean),
  );
  const email = (process.env.SYNC_USER_EMAIL || "robgreen31@gmail.com").toLowerCase();

  const folders = listProjectFolders(codeRoot, ignore);
  const plan = folders.map((f) => {
    const backlog = findBacklog(f.path);
    return { ...f, backlog, todos: backlog ? parseBacklog(backlog) : [] };
  });

  console.log(`\nDisk sync — root: ${codeRoot}`);
  console.log(`Folders: ${plan.length}${ignore.size ? `  (ignoring: ${[...ignore].join(", ")})` : ""}`);
  for (const p of plan) {
    const open = p.todos.filter((t) => !t.done).length;
    const done = p.todos.length - open;
    console.log(
      `  • ${p.name.padEnd(20)} ${p.backlog ? `${p.todos.length} todos (${open} open, ${done} done)` : "no BACKLOG.md"}`,
    );
  }

  const jobsSrc = findJobsJson(codeRoot);
  const jobs = jobsSrc ? parseJobs(jobsSrc.file) : [];
  if (jobsSrc) {
    const byStatus = {};
    for (const j of jobs) byStatus[j.status] = (byStatus[j.status] || 0) + 1;
    const summary = JOB_STATUSES.filter((s) => byStatus[s])
      .map((s) => `${s} ${byStatus[s]}`)
      .join(", ");
    console.log(
      `Job Hunter jobs: ${jobs.length}${summary ? `  (${summary})` : ""}`,
    );
  } else {
    console.log("Job Hunter jobs: no jobs.json found (skipping)");
  }

  if (DRY_RUN) {
    console.log("\n[dry-run] No database changes. Re-run without --dry-run to apply.\n");
    for (const p of plan.filter((p) => p.todos.length)) {
      console.log(`\n${p.name}:`);
      for (const t of p.todos) console.log(`  [${t.done ? "x" : " "}] ${t.title}${t.notes ? `  — ${t.notes}` : ""}`);
    }
    console.log("");
    return;
  }

  // ── real run: needs the service-role key ──────────────────────────────────
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "\n✖ Missing credentials. Add to .env.local:\n" +
        "    NEXT_PUBLIC_SUPABASE_URL=...   (already set for the app)\n" +
        "    SUPABASE_SERVICE_ROLE_KEY=...  (Supabase → Settings → API → service_role secret)\n" +
        "  Or run `npm run sync -- --dry-run` to preview without a key.\n",
    );
    process.exit(1);
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supa = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Resolve the target user id by email (service role can list users).
  const { data: list, error: listErr } = await supa.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;
  const user = list.users.find((u) => (u.email || "").toLowerCase() === email);
  if (!user) {
    console.error(`✖ No auth user with email ${email}. Sign in to the dashboard once first.`);
    process.exit(1);
  }
  const userId = user.id;
  const nowIso = new Date().toISOString();
  const stats = {
    projCreated: 0,
    projArchived: 0,
    todoAdded: 0,
    todoUpdated: 0,
    todoDeleted: 0,
    jobAdded: 0,
    jobUpdated: 0,
    jobDeleted: 0,
  };

  // Existing synced projects for this user, keyed by path.
  const { data: existingProjects, error: pErr } = await supa
    .from("projects")
    .select("id,name,status,external_path,sort_order")
    .eq("user_id", userId)
    .not("external_path", "is", null);
  if (pErr) throw pErr;
  const byPath = new Map(existingProjects.map((p) => [p.external_path, p]));
  let maxSort = Math.max(0, ...existingProjects.map((p) => p.sort_order || 0));

  const wantedPaths = new Set(plan.map((p) => p.path));

  // 1) Upsert a project per folder.
  const projectIdByPath = new Map();
  for (const p of plan) {
    const existing = byPath.get(p.path);
    if (existing) {
      projectIdByPath.set(p.path, existing.id);
      if (existing.status === "archived") {
        await supa.from("projects").update({ status: "active" }).eq("id", existing.id);
      }
    } else {
      const { data: ins, error } = await supa
        .from("projects")
        .insert({
          user_id: userId,
          name: p.name,
          status: "active",
          external_path: p.path,
          sort_order: ++maxSort,
        })
        .select("id")
        .single();
      if (error) throw error;
      projectIdByPath.set(p.path, ins.id);
      stats.projCreated++;
      console.log(`+ project: ${p.name}`);
    }
  }

  // 2) Mirror: archive synced projects whose folder vanished (and drop their synced todos).
  for (const p of existingProjects) {
    if (wantedPaths.has(p.external_path)) continue;
    const { data: del } = await supa
      .from("todos")
      .delete()
      .eq("project_id", p.id)
      .contains("tags", [SYNC_TAG])
      .select("id");
    stats.todoDeleted += del?.length || 0;
    if (p.status !== "archived") {
      await supa.from("projects").update({ status: "archived" }).eq("id", p.id);
      stats.projArchived++;
      console.log(`~ archived (folder gone): ${p.name}`);
    }
  }

  // 3) Reconcile todos per active synced project.
  for (const p of plan) {
    const projectId = projectIdByPath.get(p.path);
    const { data: existingTodos, error: tErr } = await supa
      .from("todos")
      .select("id,title,done")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .contains("tags", [SYNC_TAG]);
    if (tErr) throw tErr;
    const byKey = new Map(existingTodos.map((t) => [t.title.toLowerCase().replace(/\s+/g, " "), t]));
    const wantedKeys = new Set(p.todos.map((t) => t.key));

    let order = 0;
    for (const t of p.todos) {
      const cur = byKey.get(t.key);
      if (!cur) {
        const { error } = await supa.from("todos").insert({
          user_id: userId,
          project_id: projectId,
          title: t.title,
          notes: t.notes,
          done: t.done,
          completed_at: t.done ? nowIso : null,
          tags: [SYNC_TAG],
          priority: 0,
          sort_order: order,
        });
        if (error) throw error;
        stats.todoAdded++;
      } else if (cur.done !== t.done) {
        await supa
          .from("todos")
          .update({ done: t.done, completed_at: t.done ? nowIso : null })
          .eq("id", cur.id);
        stats.todoUpdated++;
      }
      order++;
    }
    // Mirror: delete synced todos no longer present as a checkbox.
    const stale = existingTodos.filter((t) => !wantedKeys.has(t.title.toLowerCase().replace(/\s+/g, " ")));
    for (const t of stale) {
      await supa.from("todos").delete().eq("id", t.id);
      stats.todoDeleted++;
    }
  }

  // 4) Reconcile Job Hunter jobs (read-only mirror of jobs.json → jobs table).
  if (jobsSrc) {
    const jhProjectId = projectIdByPath.get(jobsSrc.dir) ?? null;
    const cols =
      "id,external_id,project_id,company,title,location,remote,source,url," +
      "match_score,why_it_fits,salary,status,date_found,date_applied," +
      "next_action,notes,application_folder";
    const { data: existingJobs, error: jErr } = await supa
      .from("jobs")
      .select(cols)
      .eq("user_id", userId);
    if (jErr) throw jErr;
    const byExt = new Map(existingJobs.map((j) => [j.external_id, j]));
    const wantedExt = new Set(jobs.map((j) => j.external_id));

    for (const j of jobs) {
      const row = { ...j, project_id: jhProjectId };
      const cur = byExt.get(j.external_id);
      if (!cur) {
        const { error } = await supa
          .from("jobs")
          .insert({ user_id: userId, ...row });
        if (error) throw error;
        stats.jobAdded++;
      } else {
        const changed =
          (cur.project_id ?? null) !== (jhProjectId ?? null) ||
          JOB_FIELDS.some((f) => (cur[f] ?? null) !== (row[f] ?? null));
        if (changed) {
          const { error } = await supa.from("jobs").update(row).eq("id", cur.id);
          if (error) throw error;
          stats.jobUpdated++;
        }
      }
    }
    for (const j of existingJobs) {
      if (!wantedExt.has(j.external_id)) {
        await supa.from("jobs").delete().eq("id", j.id);
        stats.jobDeleted++;
      }
    }
  }

  console.log(
    `\n✔ Sync complete for ${email}:\n` +
      `  projects: +${stats.projCreated} created, ${stats.projArchived} archived\n` +
      `  todos:    +${stats.todoAdded} added, ${stats.todoUpdated} updated, ${stats.todoDeleted} deleted\n` +
      (jobsSrc
        ? `  jobs:     +${stats.jobAdded} added, ${stats.jobUpdated} updated, ${stats.jobDeleted} deleted\n`
        : ""),
  );
}

main().catch((err) => {
  console.error("\n✖ Sync failed:", err.message || err);
  process.exit(1);
});
