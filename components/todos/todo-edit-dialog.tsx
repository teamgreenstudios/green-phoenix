"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Todo, TodoPriority } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITY_LABELS, TODO_PRIORITIES } from "@/lib/todos";
import { updateTodo } from "@/app/(app)/todos/actions";

export function TodoEditDialog({
  open,
  onOpenChange,
  todo,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: Todo;
  onSaved: (t: Todo) => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [notes, setNotes] = useState(todo.notes ?? "");
  const [due, setDue] = useState(todo.due_date ?? "");
  const [priority, setPriority] = useState<TodoPriority>(todo.priority);
  const [tags, setTags] = useState((todo.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);

  // Seed the form each time it opens (intentional prop→state sync on open).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setTitle(todo.title);
    setNotes(todo.notes ?? "");
    setDue(todo.due_date ?? "");
    setPriority(todo.priority);
    setTags((todo.tags ?? []).join(", "));
  }, [open, todo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    const res = await updateTodo(todo.id, {
      title,
      notes,
      due_date: due || null,
      priority,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
    setSaving(false);
    if (res.error || !res.data) {
      toast.error(res.error ?? "Failed to save.");
      return;
    }
    onSaved(res.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit todo</DialogTitle>
          <DialogDescription>Update the details for this task.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="todo-title">Title</Label>
            <Input
              id="todo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="todo-notes">Notes</Label>
            <Textarea
              id="todo-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="todo-due">Due date</Label>
              <Input
                id="todo-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="todo-priority">Priority</Label>
              <Select
                value={String(priority)}
                onValueChange={(v) =>
                  v != null && setPriority(Number(v) as TodoPriority)
                }
              >
                <SelectTrigger id="todo-priority" className="w-full">
                  <SelectValue>
                    {(v: string | null) =>
                      v != null
                        ? PRIORITY_LABELS[Number(v) as TodoPriority]
                        : "Priority"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TODO_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={String(p)}>
                      {PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="todo-tags">Tags</Label>
            <Input
              id="todo-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="bug, idea, blocked"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. Used for filtering.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
