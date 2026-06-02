"use client";

import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Flag,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Todo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  formatDueDate,
  isOverdue,
} from "@/lib/todos";
import { TodoEditDialog } from "./todo-edit-dialog";
import { deleteTodo, moveTodo, toggleTodo } from "@/app/(app)/todos/actions";

export function TodoItem({
  todo,
  projectId,
  isFirst,
  isLast,
  onChanged,
  onDeleted,
  onMoved,
}: {
  todo: Todo;
  projectId: string | null;
  isFirst: boolean;
  isLast: boolean;
  onChanged: (t: Todo) => void;
  onDeleted: (id: string) => void;
  onMoved: (id: string, direction: "up" | "down") => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onToggle(checked: boolean) {
    onChanged({ ...todo, done: checked }); // optimistic
    const res = await toggleTodo(todo.id, checked);
    if (res.error) {
      onChanged({ ...todo, done: !checked });
      toast.error(res.error);
    }
  }

  async function onDelete() {
    setBusy(true);
    const res = await deleteTodo(todo.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    onDeleted(todo.id);
  }

  async function move(direction: "up" | "down") {
    onMoved(todo.id, direction); // optimistic
    const res = await moveTodo(todo.id, direction, { projectId });
    if (res.error) {
      onMoved(todo.id, direction === "up" ? "down" : "up"); // revert
      toast.error(res.error);
    }
  }

  const due = formatDueDate(todo.due_date);
  const overdue = isOverdue(todo.due_date, todo.done);

  return (
    <li className="flex items-start gap-2 px-3 py-2.5">
      <div className="flex flex-col pt-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={isFirst}
          onClick={() => move("up")}
          aria-label="Move up"
        >
          <ChevronUp className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          disabled={isLast}
          onClick={() => move("down")}
          aria-label="Move down"
        >
          <ChevronDown className="size-3.5" />
        </Button>
      </div>

      <div className="pt-1.5">
        <Checkbox
          checked={todo.done}
          onCheckedChange={(checked) => onToggle(Boolean(checked))}
          aria-label={todo.done ? "Mark not done" : "Mark done"}
        />
      </div>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className={cn(
            "block text-left text-sm hover:underline",
            todo.done && "text-muted-foreground line-through",
          )}
        >
          {todo.title}
        </button>
        {(todo.priority > 0 || due || todo.notes) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {todo.priority > 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  PRIORITY_STYLES[todo.priority],
                )}
              >
                <Flag className="size-3" />
                {PRIORITY_LABELS[todo.priority]}
              </span>
            )}
            {due && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  overdue && "text-red-600 dark:text-red-400",
                )}
              >
                <CalendarDays className="size-3" />
                {due}
              </span>
            )}
            {todo.notes && (
              <span className="max-w-[16rem] truncate">{todo.notes}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setEditOpen(true)}
          aria-label="Edit todo"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          disabled={busy}
          aria-label="Delete todo"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <TodoEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        todo={todo}
        onSaved={onChanged}
      />
    </li>
  );
}
