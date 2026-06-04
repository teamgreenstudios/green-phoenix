import { loadDashboard } from "@/lib/load-dashboard";
import { DashboardView } from "@/components/dashboard-view";

export default async function DashboardPage() {
  const { boards, currentBoard, tiles, projects, todos, jobs } =
    await loadDashboard();
  if (!currentBoard) {
    return (
      <p className="text-sm text-muted-foreground">No dashboard board yet.</p>
    );
  }
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
