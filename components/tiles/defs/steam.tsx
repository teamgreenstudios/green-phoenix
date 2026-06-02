"use client";

import { Gamepad2 } from "lucide-react";
import type { SteamConfig } from "@/lib/types";
import type { TileConfigFormProps, TileDefinition } from "../types";
import { Input } from "@/components/ui/input";
import { Field } from "../config-fields";
import { makeDataSourceDef } from "./data-source-tile";

function SteamConfigForm({ value, onChange }: TileConfigFormProps) {
  const c = (value ?? {}) as SteamConfig;
  return (
    <Field
      label="Steam ID"
      htmlFor="steam-id"
      description="Your 64-bit SteamID. Saved now; the live integration comes later."
    >
      <Input
        id="steam-id"
        value={c.steamId ?? ""}
        onChange={(e) => onChange({ steamId: e.target.value })}
        placeholder="76561198…"
        inputMode="numeric"
      />
    </Field>
  );
}

export const steamDef: TileDefinition = makeDataSourceDef({
  type: "steam",
  label: "Steam",
  description: "Your Steam library and recent playtime (coming soon).",
  icon: Gamepad2,
  defaultTitle: "Steam",
  emptyHint: "Add your Steam ID in tile settings to connect later.",
  defaultConfig: { steamId: "" } satisfies SteamConfig,
  ConfigForm: SteamConfigForm,
});
