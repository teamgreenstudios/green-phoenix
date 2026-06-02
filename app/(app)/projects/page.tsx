import { FolderGit2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { CreateProjectButton } from "@/components/projects/create-project-button";
import { ProjectCard } from "@/components/projects/project-card";
import { RealtimeProjects } from "@/components/projects/realtime-projects";

export default async function ProjectsPage() {
  const supabase = await createClient();
  // RLS scopes this to the signed-in user.
  const { data } = await supabase
    .from("projects")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Project[]>();
  const projects = data ?? [];

  return (
    <div className="space-y-6">
      <RealtimeProjects />
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Track where each project stands and what&apos;s next.
          </p>
        </div>
        <CreateProjectButton />
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <FolderGit2 className="size-6" />
            </div>
            <h2 className="text-base font-semibold">No projects yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add your first project to start tracking its status and focus.
            </p>
            <CreateProjectButton />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {projects.map((project, i) => (
            <ProjectCard
              key={project.id}
              project={project}
              isFirst={i === 0}
              isLast={i === projects.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
