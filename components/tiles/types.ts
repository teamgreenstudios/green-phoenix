import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { Job, Project, Todo } from "@/lib/types";

/** Data the dashboard loads once and feeds to every tile renderer. */
export type TileData = { projects: Project[]; todos: Todo[]; jobs: Job[] };

export type TileRendererProps = {
  /** The tile's row id — lets renderers persist their own config (e.g. inline edit). */
  id: string;
  config: unknown;
  title: string | null;
  data: TileData;
  /** Called after a renderer saves its own config, so the board can stay in sync. */
  onConfigSaved?: (config: unknown) => void;
  /**
   * Bumped each time the user hits the tile's refresh button (only for defs that
   * set `refreshable`). Renderers re-fetch when this changes.
   */
  refreshNonce?: number;
};

export type TileConfigFormProps = {
  value: unknown;
  onChange: (config: unknown) => void;
  data: TileData;
};

/**
 * A tile type's contract (spec §6): a renderer + a config form + metadata.
 * Config is intentionally `unknown` here so the registry can hold every type;
 * each renderer/form casts to its own typed config internally.
 */
export interface TileDefinition {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultTitle: string;
  defaultConfig: unknown;
  /** When true, TileCard shows a refresh button that bumps the renderer's `refreshNonce`. */
  refreshable?: boolean;
  Renderer: ComponentType<TileRendererProps>;
  ConfigForm: ComponentType<TileConfigFormProps>;
}
