import type { TileSize } from "@/lib/types";
import type { TileDefinition } from "./types";
import { launcherDef } from "./defs/launcher";
import { todosDef } from "./defs/todos";
import { projectStatusDef } from "./defs/project-status";
import { bookmarksDef } from "./defs/bookmarks";
import { notesDef } from "./defs/notes";
import { steamDef } from "./defs/steam";
import { mediaDef } from "./defs/media";
import { weatherDef } from "./defs/weather";
import { pomodoroDef } from "./defs/pomodoro";
import { countdownDef } from "./defs/countdown";
import { todayDef } from "./defs/today";
import { heatmapDef } from "./defs/heatmap";
import { habitsDef } from "./defs/habits";

/**
 * The tile registry (spec §6). Adding a new tile type = write a def and add it
 * here — no migration. Unknown types fall back gracefully in TileCard.
 */
export const TILE_DEFS: TileDefinition[] = [
  launcherDef,
  todosDef,
  projectStatusDef,
  bookmarksDef,
  notesDef,
  steamDef,
  mediaDef,
  weatherDef,
  pomodoroDef,
  countdownDef,
  todayDef,
  heatmapDef,
  habitsDef,
];

export const TILE_REGISTRY: Record<string, TileDefinition> = Object.fromEntries(
  TILE_DEFS.map((d) => [d.type, d]),
);

export function getTileDef(type: string): TileDefinition | undefined {
  return TILE_REGISTRY[type];
}

export const TILE_SIZES: TileSize[] = ["S", "M", "L"];

/** size → grid column span (spec §7: S=1, M=2, L=3 on a 3-col grid). */
export const TILE_SIZE_SPAN: Record<TileSize, string> = {
  S: "lg:col-span-1",
  M: "sm:col-span-2 lg:col-span-2",
  L: "sm:col-span-2 lg:col-span-3",
};
