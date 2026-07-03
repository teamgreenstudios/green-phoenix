"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  GripVertical,
  SendHorizontal,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Job, JobStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PIPELINE_STATUSES,
  SCORE_TIER_CLASS,
  STATUS_BADGE_CLASS,
  TERMINAL,
  scoreTier,
  sortByScoreDesc,
} from "@/lib/jobs";
import { markApplied, setJobStatus } from "@/app/(app)/jobs/actions";

/** Interactive Kanban pipeline: drag a card between columns (or use the ⋯ menu) to change its
 * status; the change persists via a Server Action and is written back to Job Hunter's jobs.json
 * on the next `npm run sync`. Terminal statuses live in a collapsible row below. */
export function JobsBoard({ jobs: initialJobs }: { jobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [showTerminal, setShowTerminal] = useState(false);

  const sensors = useSensors(
    // Small distance so a click on the grip/menu/link isn't read as a drag start.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  // Optimistic status change with rollback on error (mirrors the tile board's pattern).
  function move(jobId: string, target: JobStatus) {
    const job = jobs.find((j) => j.id === jobId);
    if (!job || job.status === target) return;
    const prev = jobs;
    setJobs((js) => js.map((j) => (j.id === jobId ? { ...j, status: target } : j)));
    setJobStatus(jobId, target).then((res) => {
      if (res.error) {
        setJobs(prev);
        toast.error(res.error);
      } else {
        toast.success(`Moved ${job.external_id} → ${target}`);
      }
    });
  }

  function apply(job: Job) {
    if (job.url) window.open(job.url, "_blank", "noopener,noreferrer");
    if (job.status === "Applied") return;
    const today = new Date().toISOString().slice(0, 10);
    const prev = jobs;
    setJobs((js) =>
      js.map((j) =>
        j.id === job.id ? { ...j, status: "Applied", date_applied: today } : j,
      ),
    );
    markApplied(job.id).then((res) => {
      if (res.error) {
        setJobs(prev);
        toast.error(res.error);
      } else {
        toast.success(`Applied to ${job.external_id}`);
      }
    });
  }

  // "Remove from the New list" → mark Passed (terminal): drops off the active
  // board into the collapsible Archived row, but stays in jobs.json for history.
  function dismiss(job: Job) {
    const prev = jobs;
    setJobs((js) =>
      js.map((j) => (j.id === job.id ? { ...j, status: "Passed" } : j)),
    );
    setJobStatus(job.id, "Passed").then((res) => {
      if (res.error) {
        setJobs(prev);
        toast.error(res.error);
      } else {
        toast.success(`Removed ${job.external_id}`);
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    move(String(active.id), over.id as JobStatus);
  }

  const terminalCount = jobs.filter((j) => TERMINAL.includes(j.status)).length;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_STATUSES.map((status) => (
          <JobColumn
            key={status}
            status={status}
            jobs={jobs.filter((j) => j.status === status).sort(sortByScoreDesc)}
            onMove={move}
            onApply={apply}
            onDismiss={dismiss}
          />
        ))}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowTerminal((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showTerminal ? "▾" : "▸"} Archived ({terminalCount})
        </button>
        {showTerminal && (
          <div className="mt-2 flex gap-3 overflow-x-auto pb-2">
            {TERMINAL.map((status) => (
              <JobColumn
                key={status}
                status={status}
                jobs={jobs
                  .filter((j) => j.status === status)
                  .sort(sortByScoreDesc)}
                onMove={move}
                onApply={apply}
                onDismiss={dismiss}
              />
            ))}
          </div>
        )}
      </div>
    </DndContext>
  );
}

function JobColumn({
  status,
  jobs,
  onMove,
  onApply,
  onDismiss,
}: {
  status: JobStatus;
  jobs: Job[];
  onMove: (id: string, status: JobStatus) => void;
  onApply: (job: Job) => void;
  onDismiss: (job: Job) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="flex w-60 shrink-0 flex-col gap-2">
      <div className="flex items-center justify-between px-0.5">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}
        >
          {status}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {jobs.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-16 flex-col gap-2 rounded-lg p-1 transition-colors",
          isOver && "bg-primary/5 ring-1 ring-primary/30",
        )}
      >
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onMove={onMove}
            onApply={onApply}
            onDismiss={onDismiss}
          />
        ))}
        {jobs.length === 0 && (
          <div className="rounded-lg border border-dashed border-foreground/10 py-3 text-center text-xs text-muted-foreground">
            —
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({
  job,
  onMove,
  onApply,
  onDismiss,
}: {
  job: Job;
  onMove: (id: string, status: JobStatus) => void;
  onApply: (job: Job) => void;
  onDismiss: (job: Job) => void;
}) {
  const tier = scoreTier(job.match_score);
  const meta = [job.location, job.remote].filter(Boolean).join(" · ");
  const [tailorOpen, setTailorOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: job.id });
  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg bg-card p-2.5 ring-1 ring-foreground/10",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
            aria-label="Drag to move"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="size-3.5" />
          </button>
          <span className="text-[11px] text-muted-foreground">
            {job.external_id}
          </span>
        </div>
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

      {(job.has_resume || job.has_cover_letter) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {job.has_resume && (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              <FileText className="size-2.5" />
              Resume
            </span>
          )}
          {job.has_cover_letter && (
            <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              <FileText className="size-2.5" />
              Cover letter
            </span>
          )}
        </div>
      )}

      {/* Actions are per-column: triage the New pile (accept / dismiss), then
       * tailor + apply once a job is Interested. Later stages are drag-only. */}
      {job.status === "New" && (
        <div className="mt-2 flex items-center gap-1">
          <Button
            size="sm"
            className="h-7 flex-1 gap-1 bg-emerald-600 px-2 text-xs text-white hover:bg-emerald-600/90"
            onClick={() => onMove(job.id, "Interested")}
          >
            <Check className="size-3.5" />
            Interested
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 border-rose-500/40 px-2 text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-400"
            aria-label={`Remove ${job.external_id}`}
            onClick={() => onDismiss(job)}
          >
            <X className="size-3.5" />
            Remove
          </Button>
        </div>
      )}

      {job.status === "Interested" && (
        <div className="mt-2 flex items-center gap-1">
          <Button
            size="sm"
            className="h-7 flex-1 gap-1 px-2 text-xs"
            onClick={() => setTailorOpen(true)}
          >
            <Wand2 className="size-3" />
            {job.has_resume ? "Résumé ✓" : "Tailor résumé"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 gap-1 px-2 text-xs"
            onClick={() => onApply(job)}
          >
            <SendHorizontal className="size-3" />
            Apply
          </Button>
        </div>
      )}

      <TailorDialog job={job} open={tailorOpen} onOpenChange={setTailorOpen} />
    </div>
  );
}

function TailorDialog({
  job,
  open,
  onOpenChange,
}: {
  job: Job;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const command = `/tailor-application ${job.external_id}`;

  const copy = () => {
    navigator.clipboard?.writeText(command).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Generate résumé &amp; cover letter — {job.title ?? job.external_id}
          </DialogTitle>
          <DialogDescription>
            This produces a tailored <strong>résumé.docx</strong> and{" "}
            <strong>cover-letter.docx</strong> for this job. It runs locally in Job
            Hunter (it needs your master profile and generates Word docs), so copy
            this command, run it in Claude Code, then <code>npm run sync</code> to see
            the documents show up here.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2">
          <code className="flex-1 truncate text-sm">{command}</code>
          <Button variant="outline" size="sm" onClick={copy} className="gap-1">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Resume</span>
            <span>{job.has_resume ? "✓ generated" : "— not yet"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cover letter</span>
            <span>{job.has_cover_letter ? "✓ generated" : "— not yet"}</span>
          </div>
          {job.application_folder && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Folder</span>
              <code className="truncate text-xs">
                applications/{job.application_folder}/
              </code>
            </div>
          )}
        </div>

        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
            Open the posting
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
