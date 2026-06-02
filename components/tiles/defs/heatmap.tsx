"use client";

import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";

const WEEKS = 13;
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

function level(count: number): string {
  if (count <= 0) return "bg-muted";
  if (count === 1) return "bg-primary/30";
  if (count === 2) return "bg-primary/60";
  return "bg-primary";
}

function HeatmapRenderer({ data }: TileRendererProps) {
  // Tally completions per local day.
  const counts = new Map<string, number>();
  let total = 0;
  for (const t of data.todos) {
    if (!t.completed_at) continue;
    const key = iso(new Date(t.completed_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total++;
  }

  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(end.getDate() - (WEEKS * 7 - 1));
  start.setDate(start.getDate() - start.getDay()); // back to Sunday

  // Build columns (weeks) of 7 days (Sun→Sat).
  const columns: { key: string; count: number; future: boolean }[][] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const col: { key: string; count: number; future: boolean }[] = [];
    for (let r = 0; r < 7; r++) {
      const key = iso(cursor);
      col.push({ key, count: counts.get(key) ?? 0, future: cursor > end });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(col);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1 overflow-x-auto">
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((cell) =>
              cell.future ? (
                <div key={cell.key} className="size-2.5" />
              ) : (
                <div
                  key={cell.key}
                  title={`${cell.key}: ${cell.count} done`}
                  className={cn("size-2.5 rounded-[2px]", level(cell.count))}
                />
              ),
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {total} completed in the last {WEEKS} weeks
      </p>
    </div>
  );
}

function HeatmapConfigForm(_props: TileConfigFormProps) {
  return (
    <p className="text-xs text-muted-foreground">
      Shows todos you&apos;ve completed per day — nothing to configure.
    </p>
  );
}

export const heatmapDef: TileDefinition = {
  type: "heatmap",
  label: "Activity heatmap",
  description: "A grid of todos completed per day.",
  icon: Activity,
  defaultTitle: "Activity",
  defaultConfig: {},
  Renderer: HeatmapRenderer,
  ConfigForm: HeatmapConfigForm,
};
