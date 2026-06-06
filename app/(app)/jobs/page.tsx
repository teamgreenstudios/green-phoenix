import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";
import { activeJobs } from "@/lib/jobs";
import { JobsKpis } from "@/components/jobs/jobs-kpis";
import { JobsBoard } from "@/components/jobs/jobs-board";
import { JobsRefresh } from "@/components/jobs/jobs-refresh";

export default async function JobsPage() {
  const supabase = await createClient();
  // RLS scopes to the signed-in user. Mirrored from Job Hunter by `npm run sync`.
  const { data } = await supabase
    .from("jobs")
    .select("*")
    .order("match_score", { ascending: false, nullsFirst: false })
    .returns<Job[]>();
  const jobs = data ?? [];
  // Freshness hint = the most recent row change (the sync bumps updated_at on
  // any insert/update). ISO timestamps compare correctly as strings.
  const lastUpdated = jobs.length
    ? jobs.reduce((m, j) => (j.updated_at > m ? j.updated_at : m), jobs[0].updated_at)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Job Hunter</h1>
          <p className="text-sm text-muted-foreground">
            Your job-search pipeline, mirrored from Job Hunter. Read-only — edit
            in Job Hunter or via Claude, then run <code>npm run sync</code>.
          </p>
        </div>
        {jobs.length > 0 && <JobsRefresh lastUpdated={lastUpdated} />}
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 py-12 text-center text-sm text-muted-foreground">
          No jobs yet. Run a Job Hunter screening, then <code>npm run sync</code>{" "}
          to mirror your pipeline here.
        </div>
      ) : (
        <>
          <JobsKpis jobs={jobs} />
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Pipeline</h2>
            <span className="text-xs text-muted-foreground">
              {activeJobs(jobs).length} active
            </span>
          </div>
          <JobsBoard jobs={jobs} />
        </>
      )}
    </div>
  );
}
