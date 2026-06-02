"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Tile, TileSize } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TILE_SIZES, TILE_SIZE_SPAN, getTileDef } from "./registry";
import type { TileData } from "./types";
import { deleteTile, moveTile, updateTile } from "@/app/(app)/tiles/actions";

export function TileCard({
  tile,
  data,
  editMode,
  isFirst,
  isLast,
  onChanged,
  onDeleted,
  onMoved,
  onEdit,
}: {
  tile: Tile;
  data: TileData;
  editMode: boolean;
  isFirst: boolean;
  isLast: boolean;
  onChanged: (t: Tile) => void;
  onDeleted: (id: string) => void;
  onMoved: (id: string, direction: "up" | "down") => void;
  onEdit: (t: Tile) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const def = getTileDef(tile.type);
  const title = tile.title || def?.label || tile.type;

  async function setSize(size: TileSize) {
    if (size === tile.size) return;
    const prev = tile.size;
    onChanged({ ...tile, size });
    const res = await updateTile(tile.id, { size });
    if (res.error) {
      onChanged({ ...tile, size: prev });
      toast.error(res.error);
    }
  }

  async function toggleVisible() {
    const next = !tile.visible;
    onChanged({ ...tile, visible: next });
    const res = await updateTile(tile.id, { visible: next });
    if (res.error) {
      onChanged({ ...tile, visible: !next });
      toast.error(res.error);
    }
  }

  async function onDelete() {
    setBusy(true);
    const res = await deleteTile(tile.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    onDeleted(tile.id);
  }

  async function move(direction: "up" | "down") {
    onMoved(tile.id, direction);
    const res = await moveTile(tile.id, direction);
    if (res.error) {
      onMoved(tile.id, direction === "up" ? "down" : "up");
      toast.error(res.error);
    }
  }

  return (
    <section
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card text-card-foreground",
        TILE_SIZE_SPAN[tile.size],
        editMode && !tile.visible && "opacity-50",
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
        <h3 className="truncate text-sm font-semibold">
          {title}
          {editMode && !tile.visible && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (hidden)
            </span>
          )}
        </h3>
        {(def?.refreshable || editMode) && (
          <div className="flex shrink-0 items-center gap-0.5">
            {def?.refreshable && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setRefreshNonce((n) => n + 1)}
                aria-label="Refresh tile"
              >
                <RefreshCw className="size-3.5" />
              </Button>
            )}
            {editMode && (
              <>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={isFirst}
              onClick={() => move("up")}
              aria-label="Move tile up"
            >
              <ChevronUp className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              disabled={isLast}
              onClick={() => move("down")}
              aria-label="Move tile down"
            >
              <ChevronDown className="size-3.5" />
            </Button>
            <div className="mx-1 flex overflow-hidden rounded-md border border-border">
              {TILE_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  aria-label={`Size ${s}`}
                  aria-pressed={tile.size === s}
                  className={cn(
                    "px-1.5 py-0.5 text-xs transition-colors",
                    tile.size === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={toggleVisible}
              aria-label={tile.visible ? "Hide tile" : "Show tile"}
            >
              {tile.visible ? (
                <Eye className="size-3.5" />
              ) : (
                <EyeOff className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(tile)}
              aria-label="Edit tile"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDelete}
              disabled={busy}
              aria-label="Delete tile"
            >
              <Trash2 className="size-3.5" />
            </Button>
              </>
            )}
          </div>
        )}
      </header>
      <div className="p-4">
        {def ? (
          <def.Renderer
            id={tile.id}
            config={tile.config}
            title={tile.title}
            data={data}
            onConfigSaved={(config) =>
              onChanged({ ...tile, config: config as typeof tile.config })
            }
            refreshNonce={refreshNonce}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Unknown tile type: <code className="font-mono">{tile.type}</code>
          </p>
        )}
      </div>
    </section>
  );
}
