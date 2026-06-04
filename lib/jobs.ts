/**
 * Job Hunter pipeline metadata + helpers (Phase 5 — read-only mirror).
 * Reproduces the KPI/pipeline/score logic from the Job Hunter app so the
 * dashboard shows the same numbers. Class strings are literals (Tailwind v4).
 */
import type { Job, JobStatus } from "@/lib/types";

/** Pipeline column order (matches Job Hunter's Board). */
export const JOB_STATUSES: JobStatus[] = [
  "New",
  "Interested",
  "Tailored",
  "Applied",
  "Interviewing",
  "Offer",
  "Rejected",
  "Passed",
];

/** Terminal statuses are excluded from the "active" pipeline count. */
const TERMINAL: JobStatus[] = ["Rejected", "Passed"];

export function activeJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => !TERMINAL.includes(j.status));
}

/** The six overview KPIs (same definitions as Job Hunter's Overview page). */
export function jobKpis(jobs: Job[]) {
  const count = (s: JobStatus) => jobs.filter((j) => j.status === s).length;
  return {
    total: jobs.length,
    new: count("New"),
    strong: jobs.filter((j) => (j.match_score ?? 0) >= 80).length,
    applied: jobs.filter((j) =>
      ["Applied", "Interviewing", "Offer"].includes(j.status),
    ).length,
    interviewing: count("Interviewing"),
    offers: count("Offer"),
  };
}

export type ScoreTier = "high" | "mid" | "low";

/** ≥80 high, ≥60 mid, else low (matches Job Hunter's ScoreBadge). */
export function scoreTier(score: number | null): ScoreTier {
  const s = score ?? 0;
  return s >= 80 ? "high" : s >= 60 ? "mid" : "low";
}

export const SCORE_TIER_CLASS: Record<ScoreTier, string> = {
  high: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  mid: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
};

export const STATUS_BADGE_CLASS: Record<JobStatus, string> = {
  New: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  Interested: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  Tailored: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  Applied: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  Interviewing: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  Offer: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  Rejected: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  Passed: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400",
};

/** Highest match score first (nulls last). */
export function sortByScoreDesc(a: Job, b: Job): number {
  return (b.match_score ?? -1) - (a.match_score ?? -1);
}
