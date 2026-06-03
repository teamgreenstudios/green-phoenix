"use client";

import type { Board, Project, Tile, Todo } from "@/lib/types";
import { BoardTabs } from "@/components/board-tabs";
import { TileBoard } from "@/components/tiles/tile-board";

export function DashboardView({
  boards,
  currentBoardId,
  tiles,
  projects,
  todos,
}: {
  boards: Board[];
  currentBoardId: string;
  tiles: Tile[];
  projects: Project[];
  todos: Todo[];
}) {
  return (
    <div className="space-y-4">
      <BoardTabs boards={boards} currentBoardId={currentBoardId} />
      {/* key remounts the board (fresh tile state) when switching boards */}
      <TileBoard
        key={currentBoardId}
        initialTiles={tiles}
        data={{ projects, todos }}
        boardId={currentBoardId}
      />
    </div>
  );
}
