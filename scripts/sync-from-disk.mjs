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
 *   - instascrape's data/assets/research/<shortcode>/transcript.txt files are
 *     mirrored (read-only) into the `transcripts` table (migration 0012),
 *     keyed by external_id (the reel shortcode).
 *   - MIRROR reconciliation: synced projects whose folder is gone get ARCHIVED;
 *     synced todos whose checkbox is gone get DELETED. Manual projects/todos
 *     (no external_path / no `disk-sync` tag) are never touched.
 *
 * Why local-only: a Vercel server can't read your local disk. This script runs on
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
const DEFAULT_CODE_ROOT = "/home/robgreen/projects";
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

// ── instascrape transcripts → transcripts (read-only mirror) ────────────────
function findInstascrape(codeRoot) {
  const dir = process.env.SYNC_INSTASCRAPE_DIR
    ? resolve(process.env.SYNC_INSTASCRAPE_DIR)
    : join(codeRoot, "instascrape");
  const researchDir = join(dir, "data", "assets", "research");
  return existsSync(researchDir) ? { dir, researchDir } : null;
}

const AUDIO_LINE_RE = /^\s*\[\s*[\d.]+\]\s*\(audio\)\s*(.*\S)/;

function readJsonMaybe(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function parseTranscripts(researchDir) {
  let entries;
  try {
    entries = readdirSync(researchDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    // Skip non-dirs and bookkeeping folders (e.g. _cache).
    if (!e.isDirectory() || e.name.startsWith("_") || e.name.startsWith(".")) continue;
    const file = join(researchDir, e.name, "transcript.txt");
    if (!existsSync(file)) continue;
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);

    // Readable digest from summary.json (self-contained: post meta + the summary).
    const sumPath = join(researchDir, e.name, "summary.json");
    const sum = readJsonMaybe(sumPath) || {};
    const takeaways = Array.isArray(sum.takeaways)
      ? sum.takeaways.filter((t) => typeof t === "string")
      : [];
    const keyPoints = Array.isArray(sum.key_points)
      ? sum.key_points
          .filter((p) => p && typeof p === "object")
          .map((p) => ({ point: String(p.point ?? ""), detail: String(p.detail ?? "") }))
      : [];
    const headline = typeof sum.headline === "string" ? sum.headline.trim() : "";
    const summaryText = typeof sum.summary === "string" ? sum.summary.trim() : "";
    const postType = typeof sum.post_type === "string" ? sum.post_type : null;
    const nSlides = Number.isInteger(sum.n_slides) ? sum.n_slides : null;
    const tags = Array.isArray(sum.tags)
      ? sum.tags.filter((x) => typeof x === "string")
      : [];
    // digest "references" → column "refs" (references is a reserved SQL word).
    const refs = Array.isArray(sum.references)
      ? sum.references
          .filter((r) => r && typeof r === "object" && r.name)
          .map((r) => ({ name: String(r.name), kind: String(r.kind ?? "other") }))
      : [];

    // Title: headline (best) → first spoken (audio) line → first real line
    // (skip "=== Slide N ===" carousel headers) → shortcode.
    let title = headline;
    if (!title) {
      for (const ln of lines) {
        const m = ln.match(AUDIO_LINE_RE);
        if (m) { title = m[1].trim(); break; }
      }
    }
    if (!title) {
      const first = lines.find((l) => l.trim() && !l.trim().startsWith("==="));
      title = (first || e.name).trim();
    }
    if (title.length > 200) title = title.slice(0, 197) + "…";

    // URL: trust summary.json (correct /reel/ vs /p/ carousel); else legacy reel fallback.
    const url =
      typeof sum.url === "string" && sum.url
        ? sum.url
        : `https://www.instagram.com/reel/${e.name}/`;

    // Freshness = newest of transcript.txt / summary.json mtimes.
    let scrapedAt = null;
    try {
      let ms = statSync(file).mtimeMs;
      if (existsSync(sumPath)) ms = Math.max(ms, statSync(sumPath).mtimeMs);
      scrapedAt = new Date(ms).toISOString();
    } catch {
      /* leave null */
    }

    out.push({
      external_id: e.name,
      url,
      title,
      headline: headline || null,
      summary: summaryText || null,
      takeaways,
      key_points: keyPoints,
      post_type: postType,
      n_slides: nSlides,
      tags,
      refs,
      content,
      char_count: content.length,
      line_count: lines.filter((l) => l.trim()).length,
      scraped_at: scrapedAt,
    });
  }
  return out.sort((a, b) => a.external_id.localeCompare(b.external_id));
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

  const instaSrc = findInstascrape(codeRoot);
  const transcripts = instaSrc ? parseTranscripts(instaSrc.researchDir) : [];
  if (instaSrc) {
    console.log(`instascrape transcripts: ${transcripts.length}`);
  } else {
    console.log("instascrape transcripts: no research/ dir found (skipping)");
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
    txAdded: 0,
    txUpdated: 0,
    txDeleted: 0,
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

  // 5) Reconcile instascrape transcripts (read-only mirror → transcripts table).
  if (instaSrc) {
    const isProjectId = projectIdByPath.get(instaSrc.dir) ?? null;
    const cols =
      "id,external_id,project_id,url,title,headline,summary,takeaways,key_points," +
      "tags,refs,post_type,n_slides,content,char_count,line_count,scraped_at";
    const { data: existingTx, error: txErr } = await supa
      .from("transcripts")
      .select(cols)
      .eq("user_id", userId);
    if (txErr) throw txErr;
    const byExt = new Map(existingTx.map((t) => [t.external_id, t]));
    const wantedExt = new Set(transcripts.map((t) => t.external_id));

    for (const t of transcripts) {
      const row = { ...t, project_id: isProjectId };
      const cur = byExt.get(t.external_id);
      if (!cur) {
        const { error } = await supa
          .from("transcripts")
          .insert({ user_id: userId, ...row });
        if (error) throw error;
        stats.txAdded++;
      } else {
        // Re-upsert when the transcript, the digest, or the post facets drift.
        const changed =
          (cur.project_id ?? null) !== (isProjectId ?? null) ||
          (cur.content ?? null) !== (row.content ?? null) ||
          (cur.title ?? null) !== (row.title ?? null) ||
          (cur.url ?? null) !== (row.url ?? null) ||
          (cur.headline ?? null) !== (row.headline ?? null) ||
          (cur.summary ?? null) !== (row.summary ?? null) ||
          (cur.post_type ?? null) !== (row.post_type ?? null) ||
          (cur.n_slides ?? null) !== (row.n_slides ?? null) ||
          JSON.stringify(cur.takeaways ?? []) !== JSON.stringify(row.takeaways ?? []) ||
          JSON.stringify(cur.key_points ?? []) !== JSON.stringify(row.key_points ?? []) ||
          JSON.stringify(cur.tags ?? []) !== JSON.stringify(row.tags ?? []) ||
          JSON.stringify(cur.refs ?? []) !== JSON.stringify(row.refs ?? []);
        if (changed) {
          const { error } = await supa.from("transcripts").update(row).eq("id", cur.id);
          if (error) throw error;
          stats.txUpdated++;
        }
      }
    }
    for (const t of existingTx) {
      if (!wantedExt.has(t.external_id)) {
        await supa.from("transcripts").delete().eq("id", t.id);
        stats.txDeleted++;
      }
    }
  }

  console.log(
    `\n✔ Sync complete for ${email}:\n` +
      `  projects: +${stats.projCreated} created, ${stats.projArchived} archived\n` +
      `  todos:    +${stats.todoAdded} added, ${stats.todoUpdated} updated, ${stats.todoDeleted} deleted\n` +
      (jobsSrc
        ? `  jobs:     +${stats.jobAdded} added, ${stats.jobUpdated} updated, ${stats.jobDeleted} deleted\n`
        : "") +
      (instaSrc
        ? `  transcripts: +${stats.txAdded} added, ${stats.txUpdated} updated, ${stats.txDeleted} deleted\n`
        : ""),
  );
}

main().catch((err) => {
  console.error("\n✖ Sync failed:", err.message || err);
  process.exit(1);
});
