"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Board } from "@/lib/types";
import { createBoard, deleteBoard, renameBoard } from "@/app/(app)/boards/actions";

export function BoardTabs({
  boards,
  currentBoardId,
}: {
  boards: Board[];
  currentBoardId: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);
  const [busy, setBusy] = useState(false);

  // The first board lives at "/"; the rest at "/b/[id]".
  const hrefFor = (b: Board, i: number) => (i === 0 ? "/" : `/b/${b.id}`);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const n = newName.trim();
    if (!n) {
      setAdding(false);
      return;
    }
    setBusy(true);
    const res = await createBoard(n);
    setBusy(false);
    if (res.error || !res.data) {
      toast.error(res.error ?? "Failed to add board.");
      return;
    }
    setAdding(false);
    setNewName("");
    router.push(`/b/${res.data.id}`);
    router.refresh();
  }

  async function submitRename(e: React.FormEvent, id: string) {
    e.preventDefault();
    const n = renameValue.trim();
    if (!n) {
      setRenamingId(null);
      return;
    }
    setBusy(true);
    const res = await renameBoard(id, n);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setRenamingId(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    const res = await deleteBoard(deleteTarget.id);
    setBusy(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setDeleteTarget(null);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border/60 pb-2">
      {boards.map((b, i) => {
        const active = b.id === currentBoardId;
        if (renamingId === b.id) {
          return (
            <form key={b.id} onSubmit={(e) => submitRename(e, b.id)}>
              <Input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => setRenamingId(null)}
                className="h-8 w-32"
                aria-label="Board name"
              />
            </form>
          );
        }
        return (
          <div
            key={b.id}
            className={cn(
              "flex items-center rounded-md",
              active && "bg-muted",
            )}
          >
            <Link
              href={hrefFor(b, i)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-sm transition-colors",
                active
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {b.name}
            </Link>
            {active && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Board options"
                      className="mr-0.5"
                    />
                  }
                >
                  <MoreHorizontal className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => {
                      setRenameValue(b.name);
                      setRenamingId(b.id);
                    }}
                  >
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={boards.length <= 1}
                    onClick={() => setDeleteTarget(b)}
                  >
                    <Trash2 className="size-4" />
                    Delete board
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}

      {adding ? (
        <form onSubmit={submitNew}>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={() => {
              if (!newName.trim()) setAdding(false);
            }}
            placeholder="Board name"
            className="h-8 w-32"
            aria-label="New board name"
          />
        </form>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Add board"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" />
        </Button>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete board?</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name}” and all of its tiles will be permanently
              deleted. Your projects and todos are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
