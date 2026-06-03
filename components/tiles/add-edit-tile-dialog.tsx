"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Tile } from "@/lib/types";
import { cn } from "@/lib/utils";
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
import { TILE_DEFS, getTileDef } from "./registry";
import type { TileData } from "./types";
import { createTile, updateTile } from "@/app/(app)/tiles/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TileData;
  boardId?: string;
  onSaved: (t: Tile) => void;
} & ({ mode: "add"; tile?: undefined } | { mode: "edit"; tile: Tile });

export function AddEditTileDialog(props: Props) {
  const { open, onOpenChange, data, boardId, onSaved } = props;
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [config, setConfig] = useState<unknown>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (props.mode === "edit") {
      setType(props.tile.type);
      setTitle(props.tile.title ?? "");
      setConfig(props.tile.config ?? {});
    } else {
      setType("");
      setTitle("");
      setConfig({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const def = type ? getTileDef(type) : undefined;
  const ConfigForm = def?.ConfigForm;

  function chooseType(t: string) {
    const d = getTileDef(t);
    setType(t);
    setTitle(d?.defaultTitle ?? "");
    setConfig(d?.defaultConfig ?? {});
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !def) {
      toast.error("Choose a tile type.");
      return;
    }
    setSaving(true);
    const res =
      props.mode === "add"
        ? await createTile({ type, title, config, boardId })
        : await updateTile(props.tile.id, { title, config });
    setSaving(false);
    if (res.error || !res.data) {
      toast.error(res.error ?? "Failed to save tile.");
      return;
    }
    onSaved(res.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {props.mode === "add" ? "Add tile" : "Edit tile"}
          </DialogTitle>
          <DialogDescription>
            {props.mode === "add"
              ? "Pick a tile type and configure it."
              : "Update this tile's title and settings."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          {props.mode === "add" && (
            <div className="grid gap-2">
              <Label>Type</Label>
              <div className="grid gap-2">
                {TILE_DEFS.map((d) => (
                  <button
                    key={d.type}
                    type="button"
                    onClick={() => chooseType(d.type)}
                    className={cn(
                      "flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
                      type === d.type
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <d.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{d.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {d.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {def && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="tile-title">Title</Label>
                <Input
                  id="tile-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={def.defaultTitle}
                />
              </div>
              {ConfigForm && (
                <ConfigForm
                  value={config}
                  onChange={(c) => setConfig(c)}
                  data={data}
                />
              )}
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !type}>
              {saving
                ? "Saving…"
                : props.mode === "add"
                  ? "Add tile"
                  : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
