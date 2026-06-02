import type { ProjectStatus } from "@/lib/types";

/** Status order for selects and display (matches the CHECK constraint in 0001_init.sql). */
export const PROJECT_STATUSES: ProjectStatus[] = [
  "idea",
  "active",
  "paused",
  "shipped",
  "archived",
];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "Idea",
  active: "Active",
  paused: "Paused",
  shipped: "Shipped",
  archived: "Archived",
};

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === "string" &&
    (PROJECT_STATUSES as string[]).includes(value)
  );
}
