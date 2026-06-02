"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { Todo } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TodoItem } from "./todo-item";
import { createTodo } from "@/app/(app)/todos/actions";

export function TodoList({
  scope,
  projectId = null,
  initialTodos,
}: {
  scope: "global" | "project";
  projectId?: string | null;
  initialTodos: Todo[];
}) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);

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

      {todos.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No todos yet. Add one above.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {todos.map((todo, i) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              projectId={projectId}
              isFirst={i === 0}
              isLast={i === todos.length - 1}
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
