import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, GitBranch } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Project, Todo } from "@/lib/types";
import { StatusBadge } from "@/components/projects/status-badge";
import { TodoList } from "@/components/todos/todo-list";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // RLS ensures only the owner's project is returned.
  const { data: projectData } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const project = projectData as Project | null;
  if (!project) notFound();

  const { data: todos } = await supabase
    .from("todos")
    .select("*")
    .eq("project_id", id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Todo[]>();

  return (
    <div className="space-y-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Projects
      </Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        )}
        {project.current_focus && (
          <p className="text-sm">
            <span className="text-muted-foreground">Next: </span>
            {project.current_focus}
          </p>
        )}
        {(project.repo_url || project.live_url) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {project.repo_url && (
              <a
                href={project.repo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <GitBranch className="size-3.5" />
                Repo
              </a>
            )}
            {project.live_url && (
              <a
                href={project.live_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="size-3.5" />
                Live
              </a>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Todos</h2>
        <TodoList scope="project" projectId={id} initialTodos={todos ?? []} />
      </div>
    </div>
  );
}
