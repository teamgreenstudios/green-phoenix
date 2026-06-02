"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Todo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TodoItem } from "./todo-item";
import { createTodo } from "@/app/(app)/todos/actions";
import { useRealtimeTable } from "@/lib/hooks/use-realtime";

export function TodoList({
  scope,
  projectId = null,
  initialTodos,
  filter = "all",
}: {
  scope: "global" | "project";
  projectId?: string | null;
  initialTodos: Todo[];
  filter?: "open" | "all";
}) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const byStatus = filter === "open" ? todos.filter((t) => !t.done) : todos;
  const allTags = [...new Set(todos.flatMap((t) => t.tags ?? []))].sort();
  const visible = tagFilter
    ? byStatus.filter((t) => (t.tags ?? []).includes(tagFilter))
    : byStatus;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setAdding(true);
    const res = await createTodo({ title: value, projectId });
    setAdding(false);
    if (res.error || !res.data) {
      toast.error(res.error ?? "Failed to add todo.");
      return;
    }
    setTodos((prev) => [...prev, res.data!]);
    setTitle("");
  }

  const onChanged = (updated: Todo) =>
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  const onDeleted = (id: string) =>
    setTodos((prev) => prev.filter((t) => t.id !== id));
  const onMoved = (id: string, direction: "up" | "down") =>
    setTodos((prev) => {
      const i = prev.findIndex((t) => t.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Live updates from other devices/tabs. Merges by id (idempotent, so the echo
  // of our own optimistic writes is a no-op); keeps local ordering untouched.
  useRealtimeTable("todos", (payload) => {
    if (payload.eventType === "DELETE") {
      const oldId = (payload.old as { id?: string }).id;
      if (oldId) setTodos((prev) => prev.filter((t) => t.id !== oldId));
      return;
    }
    const row = payload.new as unknown as Todo;
    const inScope =
      scope === "project" ? row.project_id === projectId : row.project_id === null;
    setTodos((prev) => {
      const exists = prev.some((t) => t.id === row.id);
      if (!inScope) return exists ? prev.filter((t) => t.id !== row.id) : prev;
      return exists ? prev.map((t) => (t.id === row.id ? row : t)) : [...prev, row];
    });
  });

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a todo…"
          aria-label={scope === "project" ? "New project todo" : "New todo"}
          disabled={adding}
        />
        <Button type="submit" disabled={adding || !title.trim()}>
          <Plus className="size-4" />
          Add
        </Button>
      </form>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter((cur) => (cur === tag ? null : tag))}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs transition-colors",
                tagFilter === tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {todos.length === 0
            ? "No todos yet. Add one above."
            : "All done — nothing open."}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {visible.map((todo, i) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              projectId={projectId}
              isFirst={i === 0}
              isLast={i === visible.length - 1}
              onChanged={onChanged}
              onDeleted={onDeleted}
              onMoved={onMoved}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
