import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { Project, Todo } from "@/lib/types";

/** Data the dashboard loads once and feeds to every tile renderer. */
export type TileData = { projects: Project[]; todos: Todo[] };

export type TileRendererProps = {
  config: unknown;
  title: string | null;
  data: TileData;
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
  Renderer: ComponentType<TileRendererProps>;
  ConfigForm: ComponentType<TileConfigFormProps>;
}
