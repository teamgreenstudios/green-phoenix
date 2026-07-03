"use client";

import Link from "next/link";
import { AlarmClock, CalendarClock, Target } from "lucide-react";
import type { Project, Todo } from "@/lib/types";
import type { TileDefinition, TileRendererProps } from "../types";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

function TodayRenderer({ data }: TileRendererProps) {
  const now = new Date();
  const today = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const soon = iso(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2),
  );

  const open = data.todos.filter((t) => !t.done && t.due_date);
  const overdue = open.filter((t) => (t.due_date as string) < today);
  const dueSoon = open.filter(
    (t) => (t.due_date as string) >= today && (t.due_date as string) <= soon,
  );
  const focus = data.projects.filter(
    (p) => p.status === "active" && p.current_focus,
  );

  if (overdue.length === 0 && dueSoon.length === 0 && focus.length === 0) {
    return (
      <p className="py-2 text-sm text-muted-foreground">
        All clear — nothing overdue or due soon. 🎉
      </p>
    );
  }

  const TodoRow = ({ t }: { t: Todo }) => (
    <li>
      <Link
        href={t.project_id ? `/projects/${t.project_id}` : "/todos"}
        className="block truncate rounded px-1.5 py-1 text-sm hover:bg-muted"
      >
        {t.title}
      </Link>
    </li>
  );

  return (
    <div className="space-y-3">
      {overdue.length > 0 && (
        <Section
          icon={<AlarmClock className="size-3.5 text-red-600 dark:text-red-400" />}
          label="Overdue"
          count={overdue.length}
        >
          {overdue.slice(0, 4).map((t) => (
            <TodoRow key={t.id} t={t} />
          ))}
        </Section>
      )}
      {dueSoon.length > 0 && (
        <Section
          icon={<CalendarClock className="size-3.5 text-muted-foreground" />}
          label="Due soon"
          count={dueSoon.length}
        >
          {dueSoon.slice(0, 4).map((t) => (
            <TodoRow key={t.id} t={t} />
          ))}
        </Section>
      )}
      {focus.length > 0 && (
        <Section
          icon={<Target className="size-3.5 text-muted-foreground" />}
          label="Focus"
          count={focus.length}
        >
          {focus.slice(0, 4).map((p: Project) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block rounded px-1.5 py-1 text-sm hover:bg-muted"
              >
                <span className="font-medium">{p.name}</span>
                <span className="ml-1 truncate text-xs text-muted-foreground">
                  {p.current_focus}
                </span>
              </Link>
            </li>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  icon,
  label,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
        <span className="text-muted-foreground/70">({count})</span>
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function TodayConfigForm() {
  return (
    <p className="text-xs text-muted-foreground">
      This tile fills itself from your todos and projects — nothing to configure.
    </p>
  );
}

export const todayDef: TileDefinition = {
  type: "today",
  label: "Today",
  description: "Overdue and due-soon todos, plus projects needing focus.",
  icon: CalendarClock,
  defaultTitle: "Today",
  defaultConfig: {},
  Renderer: TodayRenderer,
  ConfigForm: TodayConfigForm,
};
