"use client";

import { useState } from "react";
import { Check, LayoutGrid, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { Tile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { TileCard } from "./tile-card";
import { AddEditTileDialog } from "./add-edit-tile-dialog";
import type { TileData } from "./types";
import { reorderTiles } from "@/app/(app)/tiles/actions";

export function TileBoard({
  initialTiles,
  data,
}: {
  initialTiles: Tile[];
  data: TileData;
}) {
  const [tiles, setTiles] = useState<Tile[]>(initialTiles);
  const [editMode, setEditMode] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Tile | null>(null);

  // In edit mode show all tiles (incl. hidden); otherwise only visible ones.
  const shown = editMode ? tiles : tiles.filter((t) => t.visible);

  const onChanged = (t: Tile) =>
    setTiles((prev) => prev.map((x) => (x.id === t.id ? t : x)));
  const onDeleted = (id: string) =>
    setTiles((prev) => prev.filter((x) => x.id !== id));
  const onCreated = (t: Tile) => setTiles((prev) => [...prev, t]);
  const onMoved = (id: string, direction: "up" | "down") =>
    setTiles((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      const j = direction === "up" ? i - 1 : i + 1;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const sensors = useSensors(
    // Small distance so clicks on the header controls aren't read as drags.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tiles.findIndex((t) => t.id === active.id);
    const newIndex = tiles.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const prev = tiles;
    const next = arrayMove(tiles, oldIndex, newIndex);
    setTiles(next); // optimistic
    reorderTiles(next.map((t) => t.id)).then((res) => {
      if (res.error) {
        setTiles(prev);
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {editMode && (
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add tile
          </Button>
        )}
        <Button
          variant={editMode ? "default" : "outline"}
          size="sm"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? (
            <>
              <Check className="size-4" />
              Done
            </>
          ) : (
            <>
              <Pencil className="size-4" />
              Edit
            </>
          )}
        </Button>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LayoutGrid className="size-6" />
          </div>
          <h2 className="text-base font-semibold">No tiles yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add your first tile — a launcher, a todo list, or a project status
            board.
          </p>
          <Button
            onClick={() => {
              setEditMode(true);
              setAddOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add tile
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={shown.map((t) => t.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((tile) => {
                const idx = tiles.findIndex((t) => t.id === tile.id);
                return (
                  <TileCard
                    key={tile.id}
                    tile={tile}
                    data={data}
                    editMode={editMode}
                    isFirst={idx === 0}
                    isLast={idx === tiles.length - 1}
                    onChanged={onChanged}
                    onDeleted={onDeleted}
                    onMoved={onMoved}
                    onEdit={(t) => setEditing(t)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AddEditTileDialog
        mode="add"
        open={addOpen}
        onOpenChange={setAddOpen}
        data={data}
        onSaved={onCreated}
      />
      {editing && (
        <AddEditTileDialog
          mode="edit"
          tile={editing}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          data={data}
          onSaved={(t) => {
            onChanged(t);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
