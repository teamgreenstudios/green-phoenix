"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";
import type { JobHunterConfig } from "@/lib/types";
import {
  SCORE_TIER_CLASS,
  jobKpis,
  scoreTier,
  sortByScoreDesc,
} from "@/lib/jobs";
import { Input } from "@/components/ui/input";
import { JobsRefresh } from "@/components/jobs/jobs-refresh";
import { Field } from "../config-fields";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";

function JobHunterRenderer({ config, data }: TileRendererProps) {
  const cfg = (config ?? {}) as JobHunterConfig;
  const topN = Math.max(1, Math.min(10, cfg.topN ?? 5));
  const jobs = data.jobs;

  if (jobs.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        No jobs yet — run <code>npm run sync</code> after a Job Hunter screening.
      </p>
    );
  }

  const k = jobKpis(jobs);
  const top = [...jobs].sort(sortByScoreDesc).slice(0, topN);
  const stats: { n: number; l: string }[] = [
    { n: k.total, l: "Total" },
    { n: k.strong, l: "Strong" },
    { n: k.applied, l: "Applied+" },
    { n: k.interviewing, l: "Interview" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div
            key={s.l}
            className="rounded-lg bg-muted/50 px-2 py-1.5 text-center"
          >
            <div className="text-lg font-semibold leading-none tabular-nums">
              {s.n}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {s.l}
            </div>
          </div>
        ))}
      </div>

      <ul className="space-y-1">
        {top.map((j) => {
          const tier = scoreTier(j.match_score);
          return (
            <li key={j.id} className="flex items-center gap-2">
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${SCORE_TIER_CLASS[tier]}`}
              >
                {j.match_score ?? "—"}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {j.url ? (
                  <a
                    href={j.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {j.title}
                  </a>
                ) : (
                  j.title
                )}
                {j.company && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    {j.company}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between">
        <Link
          href="/jobs"
          className="text-xs font-medium text-primary hover:underline"
        >
          View pipeline →
        </Link>
        <JobsRefresh compact />
      </div>
    </div>
  );
}

function JobHunterConfigForm({ value, onChange }: TileConfigFormProps) {
  const c = (value ?? {}) as JobHunterConfig;
  return (
    <Field
      label="Top matches to show"
      htmlFor="jh-topn"
      description="How many highest-scoring jobs to list (1–10). Synced from Job Hunter via `npm run sync`."
    >
      <Input
        id="jh-topn"
        type="number"
        min={1}
        max={10}
        value={c.topN ?? 5}
        onChange={(e) => onChange({ topN: Number(e.target.value) || 5 })}
      />
    </Field>
  );
}

export const jobHunterDef: TileDefinition = {
  type: "job_hunter",
  label: "Job Hunter",
  description: "Your job-search pipeline at a glance — KPIs + top matches.",
  icon: Briefcase,
  defaultTitle: "Job Hunter",
  defaultConfig: { topN: 5 } satisfies JobHunterConfig,
  Renderer: JobHunterRenderer,
  ConfigForm: JobHunterConfigForm,
};
