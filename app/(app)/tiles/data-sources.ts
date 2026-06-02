"use server";

import type { MediaConfig, SteamConfig } from "@/lib/types";

/**
 * Result of a data-source tile "fetch". Phase 2 ships stubs only — `ok` is always
 * false and `message` explains the integration isn't wired yet. The shape is the
 * contract a real Steam/media fetch will fill in later (items, counts, etc.).
 */
export type DataSourceResult = {
  ok: boolean;
  message: string;
  fetchedAt: string; // ISO timestamp, server-stamped
  detail?: string; // echo of the configured connection param, if any
};

const LABELS: Record<string, string> = {
  steam: "Steam",
  media: "Media library",
};

/**
 * Stub "refresh" for a data-source tile. Returns canned placeholder data plus a
 * fresh timestamp so the per-tile refresh affordance is demonstrable end-to-end.
 * Replace the per-type branch with a real fetch when wiring an integration.
 */
export async function refreshDataSource(
  type: string,
  config: unknown,
): Promise<DataSourceResult> {
  const fetchedAt = new Date().toISOString();
  const label = LABELS[type] ?? "Data source";

  let detail: string | undefined;
  if (type === "steam") {
    const id = (config as SteamConfig)?.steamId?.trim();
    detail = id ? `Steam ID ${id}` : undefined;
  } else if (type === "media") {
    const url = (config as MediaConfig)?.libraryUrl?.trim();
    detail = url || undefined;
  }

  return {
    ok: false,
    message: `${label} integration coming soon.`,
    fetchedAt,
    detail,
  };
}
