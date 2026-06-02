"use client";

import { ListChecks } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TodoList } from "@/components/todos/todo-list";
import type { TodosTileConfig } from "@/lib/types";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";
import { Field } from "../config-fields";

function asConfig(config: unknown): TodosTileConfig {
  const c = (config ?? {}) as Partial<TodosTileConfig>;
  return {
    scope: c.scope === "project" ? "project" : "global",
    project_id: c.project_id,
    filter: c.filter === "all" ? "all" : "open",
  };
}

function TodosRenderer({ config, data }: TileRendererProps) {
  const cfg = asConfig(config);
  if (cfg.scope === "project" && !cfg.project_id) {
    return (
      <p className="text-sm text-muted-foreground">
        Pick a project in this tile&apos;s settings.
      </p>
    );
  }
  const projectId = cfg.scope === "project" ? cfg.project_id! : null;
  const todos = data.todos.filter((t) =>
    cfg.scope === "project" ? t.project_id === projectId : t.project_id === null,
  );
  return (
    <TodoList
      scope={cfg.scope}
      projectId={projectId}
      initialTodos={todos}
      filter={cfg.filter}
    />
  );
}

function TodosConfigForm({ value, onChange, data }: TileConfigFormProps) {
  const cfg = asConfig(value);
  return (
    <div className="grid gap-4">
      <Field label="Scope" description="Show your global todos or one project's.">
        <Select
          value={cfg.scope}
          onValueChange={(v) =>
            v && onChange({ ...cfg, scope: v as "global" | "project" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(v: string | null) => (v === "project" ? "A project" : "Global")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="global">Global</SelectItem>
            <SelectItem value="project">A project</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {cfg.scope === "project" && (
        <Field label="Project">
          <Select
            value={cfg.project_id ?? ""}
            onValueChange={(v) => v && onChange({ ...cfg, project_id: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(v: string | null) =>
                  data.projects.find((p) => p.id === v)?.name ??
                  "Select project"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {data.projects.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No projects yet.
                </div>
              )}
              {data.projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field label="Show" description="Open todos only, or include completed ones.">
        <Select
          value={cfg.filter ?? "open"}
          onValueChange={(v) =>
            v && onChange({ ...cfg, filter: v as "open" | "all" })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(v: string | null) => (v === "all" ? "All todos" : "Open todos")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open todos</SelectItem>
            <SelectItem value="all">All todos</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

export const todosDef: TileDefinition = {
  type: "todos",
  label: "Todos",
  description: "A todo list bound to global or one project.",
  icon: ListChecks,
  defaultTitle: "Todos",
  defaultConfig: { scope: "global", filter: "open" } satisfies TodosTileConfig,
  Renderer: TodosRenderer,
  ConfigForm: TodosConfigForm,
};
