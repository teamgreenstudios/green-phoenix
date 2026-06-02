import type { TodoPriority } from "@/lib/types";

export const TODO_PRIORITIES: TodoPriority[] = [0, 1, 2, 3];

export const PRIORITY_LABELS: Record<TodoPriority, string> = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High",
};

/** Accent class for the priority flag (none = hidden by the caller). */
export const PRIORITY_STYLES: Record<TodoPriority, string> = {
  0: "",
  1: "text-muted-foreground",
  2: "text-amber-600 dark:text-amber-400",
  3: "text-red-600 dark:text-red-400",
};

export function isTodoPriority(value: unknown): value is TodoPriority {
  return value === 0 || value === 1 || value === 2 || value === 3;
}

/** Format an ISO date (YYYY-MM-DD) for display, or null if unset. */
export function formatDueDate(due: string | null): string | null {
  if (!due) return null;
  const d = new Date(due + "T00:00:00");
  if (Number.isNaN(d.getTime())) return due;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(due: string | null, done: boolean): boolean {
  if (!due || done) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(due + "T00:00:00");
  return d.getTime() < today.getTime();
}
