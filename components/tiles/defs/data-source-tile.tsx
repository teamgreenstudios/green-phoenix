"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";
import {
  refreshDataSource,
  type DataSourceResult,
} from "@/app/(app)/tiles/data-sources";

/**
 * Shared scaffold for "data-source" tiles (Steam, media, …). Owns the
 * fetch/loading/last-checked lifecycle and re-fetches whenever the tile's
 * refresh button bumps `refreshNonce`. Phase 2 fetches are stubs (see
 * app/(app)/tiles/data-sources.ts); the renderer is already shaped for real data.
 */
function DataSourceRenderer({
  type,
  config,
  refreshNonce,
  icon: Icon,
  emptyHint,
}: {
  type: string;
  config: unknown;
  refreshNonce?: number;
  icon: LucideIcon;
  emptyHint: string;
}) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<DataSourceResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refreshDataSource(type, config).then((r) => {
      if (!cancelled) {
        setResult(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [type, config, refreshNonce]);

  if (loading && !result) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking…
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-3 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-medium">{result?.message}</p>
      <p className="text-xs text-muted-foreground">
        {result?.detail || emptyHint}
      </p>
      {result?.fetchedAt && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          {loading && <Loader2 className="size-3 animate-spin" />}
          Last checked {new Date(result.fetchedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

/** Build a data-source TileDefinition from a few per-source bits. */
export function makeDataSourceDef(opts: {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultTitle: string;
  emptyHint: string;
  defaultConfig: unknown;
  ConfigForm: ComponentType<TileConfigFormProps>;
}): TileDefinition {
  function Renderer({ config, refreshNonce }: TileRendererProps) {
    return (
      <DataSourceRenderer
        type={opts.type}
        config={config}
        refreshNonce={refreshNonce}
        icon={opts.icon}
        emptyHint={opts.emptyHint}
      />
    );
  }
  Renderer.displayName = `DataSourceRenderer(${opts.type})`;

  return {
    type: opts.type,
    label: opts.label,
    description: opts.description,
    icon: opts.icon,
    defaultTitle: opts.defaultTitle,
    defaultConfig: opts.defaultConfig,
    refreshable: true,
    Renderer,
    ConfigForm: opts.ConfigForm,
  };
}
