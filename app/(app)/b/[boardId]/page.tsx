import { notFound } from "next/navigation";
import { loadDashboard } from "@/lib/load-dashboard";
import { DashboardView } from "@/components/dashboard-view";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const { boards, currentBoard, missing, tiles, projects, todos, jobs } =
    await loadDashboard(boardId);
  if (missing || !currentBoard) notFound();
  return (
    <DashboardView
      boards={boards}
      currentBoardId={currentBoard.id}
      tiles={tiles}
      projects={projects}
      todos={todos}
      jobs={jobs}
    />
  );
}
