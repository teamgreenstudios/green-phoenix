"use client";

import { Clapperboard } from "lucide-react";
import type { MediaConfig } from "@/lib/types";
import type { TileConfigFormProps, TileDefinition } from "../types";
import { Input } from "@/components/ui/input";
import { Field } from "../config-fields";
import { makeDataSourceDef } from "./data-source-tile";

function MediaConfigForm({ value, onChange }: TileConfigFormProps) {
  const c = (value ?? {}) as MediaConfig;
  return (
    <Field
      label="Library URL"
      htmlFor="media-url"
      description="Your media server URL (e.g. Plex/Jellyfin). Saved now; the live integration comes later."
    >
      <Input
        id="media-url"
        value={c.libraryUrl ?? ""}
        onChange={(e) => onChange({ libraryUrl: e.target.value })}
        placeholder="https://media.example.com"
      />
    </Field>
  );
}

export const mediaDef: TileDefinition = makeDataSourceDef({
  type: "media",
  label: "Media",
  description: "Your media library (Plex/Jellyfin) at a glance (coming soon).",
  icon: Clapperboard,
  defaultTitle: "Media",
  emptyHint: "Add your library URL in tile settings to connect later.",
  defaultConfig: { libraryUrl: "" } satisfies MediaConfig,
  ConfigForm: MediaConfigForm,
});
