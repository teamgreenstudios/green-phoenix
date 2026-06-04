import type { Job } from "@/lib/types";
import { jobKpis } from "@/lib/jobs";

/** The six overview KPI cards (same definitions as Job Hunter's Overview). */
export function JobsKpis({ jobs }: { jobs: Job[] }) {
  const k = jobKpis(jobs);
  const cards: { n: number; l: string }[] = [
    { n: k.total, l: "Total tracked" },
    { n: k.new, l: "New / unreviewed" },
    { n: k.strong, l: "Strong matches (80+)" },
    { n: k.applied, l: "Applied+" },
    { n: k.interviewing, l: "Interviewing" },
    { n: k.offers, l: "Offers" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div
          key={c.l}
          className="rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10"
        >
          <div className="text-2xl font-semibold tracking-tight tabular-nums">
            {c.n}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">{c.l}</div>
        </div>
      ))}
    </div>
  );
}
