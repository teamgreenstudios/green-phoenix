"use client";

import { GitBranch } from "lucide-react";
import type { GithubConfig } from "@/lib/types";
import type { TileConfigFormProps, TileDefinition } from "../types";
import { Input } from "@/components/ui/input";
import { Field } from "../config-fields";
import { makeDataSourceDef } from "./data-source-tile";

function GithubConfigForm({ value, onChange }: TileConfigFormProps) {
  const c = (value ?? {}) as GithubConfig;
  return (
    <Field
      label="GitHub username"
      htmlFor="gh-user"
      description="Shows recent public activity. A GITHUB_TOKEN env var adds private activity + higher rate limits."
    >
      <Input
        id="gh-user"
        value={c.username ?? ""}
        onChange={(e) => onChange({ username: e.target.value })}
        placeholder="octocat"
      />
    </Field>
  );
}

export const githubDef: TileDefinition = makeDataSourceDef({
  type: "github",
  label: "GitHub",
  description: "Recent activity across your repositories.",
  icon: GitBranch,
  defaultTitle: "GitHub",
  emptyHint: "Add a GitHub username in tile settings.",
  defaultConfig: { username: "" } satisfies GithubConfig,
  ConfigForm: GithubConfigForm,
});
