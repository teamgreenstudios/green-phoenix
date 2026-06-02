"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/projects/status-badge";
import type { ProjectStatusConfig } from "@/lib/types";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";
import { Field } from "../config-fields";

const ALL = "__all__";

function asConfig(config: unknown): ProjectStatusConfig {
  const c = (config ?? {}) as Partial<ProjectStatusConfig>;
  return { project_id: c.project_id };
}

function ProjectStatusRenderer({ config, data }: TileRendererProps) {
  const cfg = asConfig(config);
  const projects = cfg.project_id
    ? data.projects.filter((p) => p.id === cfg.project_id)
    : data.projects;

  if (projects.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {cfg.project_id ? "Project not found." : "No projects yet."}
      </p>
    );
  }
  return (
    <ul className="grid gap-2.5">
      {projects.map((p) => (
        <li key={p.id} className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/projects/${p.id}`}
              className="text-sm font-medium hover:underline"
            >
              {p.name}
            </Link>
            {p.current_focus && (
              <p className="truncate text-xs text-muted-foreground">
                {p.current_focus}
              </p>
            )}
          </div>
          <StatusBadge status={p.status} />
        </li>
      ))}
    </ul>
  );
}

function ProjectStatusConfigForm({ value, onChange, data }: TileConfigFormProps) {
  const cfg = asConfig(value);
  const current = cfg.project_id ?? ALL;
  return (
    <Field label="Project" description="Show a single project or all of them.">
      <Select
        value={current}
        onValueChange={(v) =>
          onChange({ project_id: v === ALL || !v ? undefined : v })
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue>
            {(v: string | null) =>
              !v || v === ALL
                ? "All projects"
                : (data.projects.find((p) => p.id === v)?.name ??
                  "All projects")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All projects</SelectItem>
          {data.projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export const projectStatusDef: TileDefinition = {
  type: "project_status",
  label: "Project status",
  description: "Status, focus, and links for one or all projects.",
  icon: Activity,
  defaultTitle: "Project status",
  defaultConfig: {} satisfies ProjectStatusConfig,
  Renderer: ProjectStatusRenderer,
  ConfigForm: ProjectStatusConfigForm,
};
