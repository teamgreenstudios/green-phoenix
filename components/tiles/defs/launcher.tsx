"use client";

import { ExternalLink, Plus, Rocket, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LauncherConfig, LauncherItem } from "@/lib/types";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";

function asConfig(config: unknown): LauncherConfig {
  const c = (config ?? {}) as Partial<LauncherConfig>;
  return { items: Array.isArray(c.items) ? c.items : [] };
}

function LauncherRenderer({ config }: TileRendererProps) {
  const { items } = asConfig(config);
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No links yet. Edit this tile to add some.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item, i) => (
        <a
          key={i}
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted"
        >
          <span className="truncate">{item.label || item.url}</span>
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}

function LauncherConfigForm({ value, onChange }: TileConfigFormProps) {
  const { items } = asConfig(value);
  const set = (next: LauncherItem[]) => onChange({ items: next });
  const update = (i: number, patch: Partial<LauncherItem>) =>
    set(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  return (
    <div className="grid gap-2">
      <Label>Links</Label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Label"
            value={item.label}
            onChange={(e) => update(i, { label: e.target.value })}
            aria-label={`Link ${i + 1} label`}
          />
          <Input
            placeholder="https://…"
            value={item.url}
            onChange={(e) => update(i, { url: e.target.value })}
            aria-label={`Link ${i + 1} URL`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove link"
            onClick={() => set(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => set([...items, { label: "", url: "" }])}
      >
        <Plus className="size-4" />
        Add link
      </Button>
    </div>
  );
}

export const launcherDef: TileDefinition = {
  type: "launcher",
  label: "Launcher",
  description: "A grid of buttons that open your apps and links.",
  icon: Rocket,
  defaultTitle: "Launcher",
  defaultConfig: { items: [] } satisfies LauncherConfig,
  Renderer: LauncherRenderer,
  ConfigForm: LauncherConfigForm,
};
