import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/projects";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  idea: "bg-muted text-muted-foreground",
  active: "bg-primary/15 text-primary",
  paused: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  shipped: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  archived: "bg-muted text-muted-foreground/70",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge className={cn("border-transparent", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
