import type { Job } from "@/lib/types";
import {
  PIPELINE_STATUSES,
  SCORE_TIER_CLASS,
  STATUS_BADGE_CLASS,
  scoreTier,
  sortByScoreDesc,
} from "@/lib/jobs";

/** Read-only Kanban pipeline (active status columns, cards sorted by match score).
 * Terminal statuses (Rejected/Passed/Expired) are not shown as columns. */
export function JobsBoard({ jobs }: { jobs: Job[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {PIPELINE_STATUSES.map((col) => {
        const items = jobs
          .filter((j) => j.status === col)
          .sort(sortByScoreDesc);
        return (
          <div key={col} className="flex w-60 shrink-0 flex-col gap-2">
            <div className="flex items-center justify-between px-0.5">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[col]}`}
              >
                {col}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-foreground/10 py-3 text-center text-xs text-muted-foreground">
                  —
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const tier = scoreTier(job.match_score);
  const meta = [job.location, job.remote].filter(Boolean).join(" · ");
  return (
    <div className="rounded-lg bg-card p-2.5 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {job.external_id}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${SCORE_TIER_CLASS[tier]}`}
        >
          {job.match_score ?? "—"}
        </span>
      </div>
      <div className="mt-1 text-sm font-medium leading-snug">
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {job.title}
          </a>
        ) : (
          job.title
        )}
      </div>
      {job.company && (
        <div className="text-xs text-muted-foreground">{job.company}</div>
      )}
      {meta && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{meta}</div>
      )}
    </div>
  );
}
