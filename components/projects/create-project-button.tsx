"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectFormDialog } from "./project-form-dialog";

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New project
      </Button>
      <ProjectFormDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
