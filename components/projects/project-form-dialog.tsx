"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project, ProjectStatus } from "@/lib/types";
import { PROJECT_STATUSES, STATUS_LABELS } from "@/lib/projects";
import {
  createProject,
  updateProject,
  type ProjectInput,
} from "@/app/(app)/projects/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  project?: Project;
};

export function ProjectFormDialog({ open, onOpenChange, mode, project }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [currentFocus, setCurrentFocus] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Seed the form each time it opens.
  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setStatus(project?.status ?? "active");
    setCurrentFocus(project?.current_focus ?? "");
    setRepoUrl(project?.repo_url ?? "");
    setLiveUrl(project?.live_url ?? "");
  }, [open, project]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    const input: ProjectInput = {
      name,
      description,
      status,
      current_focus: currentFocus,
      repo_url: repoUrl,
      live_url: liveUrl,
    };
    const result =
      mode === "create"
        ? await createProject(input)
        : await updateProject(project!.id, input);
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(mode === "create" ? "Project created." : "Project updated.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "New project" : "Edit project"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a project to track on your dashboard."
              : "Update this project's details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My project"
              autoFocus
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is it?"
              rows={2}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="project-status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                value && setStatus(value as ProjectStatus)
              }
            >
              <SelectTrigger id="project-status" className="w-full">
                <SelectValue>
                  {(value: string | null) =>
                    value
                      ? STATUS_LABELS[value as ProjectStatus]
                      : "Select status"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROJECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="project-focus">Current focus</Label>
            <Input
              id="project-focus"
              value={currentFocus}
              onChange={(e) => setCurrentFocus(e.target.value)}
              placeholder="Where am I / next step"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="project-repo">Repo URL</Label>
              <Input
                id="project-repo"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/…"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="project-live">Live URL</Label>
              <Input
                id="project-live"
                type="url"
                value={liveUrl}
                onChange={(e) => setLiveUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
