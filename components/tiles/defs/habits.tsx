"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Repeat2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Habit, HabitEntry } from "@/lib/types";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";
import { Field } from "../config-fields";
import { useRealtimeTable } from "@/lib/hooks/use-realtime";
import {
  createHabit,
  deleteHabit,
  loadHabits,
  toggleHabitDay,
} from "@/app/(app)/habits/actions";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

function asConfig(config: unknown): { days: number } {
  const c = (config ?? {}) as { days?: number };
  const d = typeof c.days === "number" ? c.days : 7;
  return { days: Math.min(14, Math.max(3, Math.floor(d))) };
}

function HabitsRenderer({ config }: TileRendererProps) {
  const { days } = asConfig(config);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  const reload = useCallback(() => {
    loadHabits().then(({ habits, entries }) => {
      setHabits(habits);
      setEntries(entries);
      setLoading(false);
    });
  }, []);

  useEffect(() => reload(), [reload]);
  useRealtimeTable("habit_entries", reload);
  useRealtimeTable("habits", reload);

  // Day columns, oldest → today.
  const now = new Date();
  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dayKeys.push(iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)));
  }
  const today = dayKeys[dayKeys.length - 1];
  const set = new Set(entries.map((e) => `${e.habit_id}|${e.day}`));
  const has = (habitId: string, day: string) => set.has(`${habitId}|${day}`);

  function streak(habitId: string): number {
    let n = 0;
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    while (has(habitId, iso(d))) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }

  async function toggle(habitId: string, day: string) {
    const key = `${habitId}|${day}`;
    const wasDone = set.has(key);
    // optimistic
    setEntries((prev) =>
      wasDone
        ? prev.filter((e) => !(e.habit_id === habitId && e.day === day))
        : [
            ...prev,
            { id: `tmp-${key}`, user_id: "", habit_id: habitId, day, created_at: "" },
          ],
    );
    const res = await toggleHabitDay(habitId, day);
    if (res.error) {
      toast.error(res.error);
      reload();
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const v = name.trim();
    if (!v) return;
    setName("");
    const res = await createHabit(v);
    if (res.error || !res.data) {
      toast.error(res.error ?? "Failed to add habit.");
      return;
    }
    setHabits((prev) => [...prev, res.data!]);
  }

  async function remove(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    const res = await deleteHabit(id);
    if (res.error) {
      toast.error(res.error);
      reload();
    }
  }

  if (loading) {
    return <p className="py-2 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-3">
      {habits.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No habits yet. Add one below.
        </p>
      ) : (
        <ul className="space-y-2">
          {habits.map((h) => {
            const s = streak(h.id);
            return (
              <li key={h.id} className="group flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{h.name}</span>
                    {s > 0 && (
                      <span className="text-xs text-primary">🔥 {s}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {dayKeys.map((day) => {
                    const done = has(h.id, day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggle(h.id, day)}
                        aria-label={`${h.name} ${day}`}
                        title={day}
                        className={cn(
                          "size-4 rounded-full border transition-colors",
                          done
                            ? "border-primary bg-primary"
                            : "border-border hover:border-primary/60",
                          day === today && !done && "ring-1 ring-primary/40",
                        )}
                      />
                    );
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Delete ${h.name}`}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => remove(h.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={add} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New habit…"
          aria-label="New habit"
        />
        <Button type="submit" size="sm" disabled={!name.trim()}>
          <Plus className="size-4" />
          Add
        </Button>
      </form>
    </div>
  );
}

function HabitsConfigForm({ value, onChange }: TileConfigFormProps) {
  const { days } = asConfig(value);
  return (
    <Field label="Days shown" htmlFor="habit-days" description="Between 3 and 14.">
      <Input
        id="habit-days"
        type="number"
        min={3}
        max={14}
        value={days}
        onChange={(e) =>
          onChange({ days: e.target.value === "" ? undefined : Number(e.target.value) })
        }
      />
    </Field>
  );
}

export const habitsDef: TileDefinition = {
  type: "habits",
  label: "Habits",
  description: "Track daily habits and build streaks.",
  icon: Repeat2,
  defaultTitle: "Habits",
  defaultConfig: { days: 7 },
  Renderer: HabitsRenderer,
  ConfigForm: HabitsConfigForm,
};
