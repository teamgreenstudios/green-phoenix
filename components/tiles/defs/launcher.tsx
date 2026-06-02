"use client";

import { ExternalLink, Rocket } from "lucide-react";
import type { LauncherConfig } from "@/lib/types";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";
import { LinkItemsEditor } from "../config-fields";

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
  return (
    <LinkItemsEditor
      items={items}
      onChange={(next) => onChange({ items: next })}
      label="Links"
      addLabel="Add link"
    />
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
