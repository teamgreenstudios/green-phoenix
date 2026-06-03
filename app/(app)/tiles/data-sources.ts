"use server";

import type { GithubConfig, MediaConfig, SteamConfig } from "@/lib/types";

export type DataSourceItem = { label: string; sub?: string; url?: string };

/**
 * Result of a data-source tile fetch. `items` (when `ok`) is the live payload
 * the renderer lists; otherwise `message`/`detail` explain why it's not wired
 * (missing token/config). GitHub works from a public username alone (a
 * GITHUB_TOKEN only raises rate limits + adds private activity); Steam needs a
 * STEAM_API_KEY; media is still a stub.
 */
export type DataSourceResult = {
  ok: boolean;
  message: string;
  fetchedAt: string; // ISO, server-stamped
  detail?: string;
  items?: DataSourceItem[];
};

const LABELS: Record<string, string> = {
  steam: "Steam",
  media: "Media library",
  github: "GitHub",
};

export async function refreshDataSource(
  type: string,
  config: unknown,
): Promise<DataSourceResult> {
  const fetchedAt = new Date().toISOString();
  try {
    if (type === "github") return await fetchGithub(config, fetchedAt);
    if (type === "steam") return await fetchSteam(config, fetchedAt);
  } catch (e) {
    return {
      ok: false,
      message: `${LABELS[type] ?? "Data source"} fetch failed.`,
      fetchedAt,
      detail: e instanceof Error ? e.message : undefined,
    };
  }
  // media + unknown types: still a stub.
  const label = LABELS[type] ?? "Data source";
  let detail: string | undefined;
  if (type === "media") {
    detail = (config as MediaConfig)?.libraryUrl?.trim() || undefined;
  }
  return { ok: false, message: `${label} integration coming soon.`, fetchedAt, detail };
}

async function fetchGithub(
  config: unknown,
  fetchedAt: string,
): Promise<DataSourceResult> {
  const cfg = (config ?? {}) as GithubConfig;
  let username = cfg.username?.trim();
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  if (!username) {
    if (!token) {
      return { ok: false, message: "Add a GitHub username in settings.", fetchedAt };
    }
    const ures = await fetch("https://api.github.com/user", {
      headers,
      cache: "no-store",
    });
    if (ures.ok) username = (await ures.json())?.login;
    if (!username) {
      return { ok: false, message: "Couldn't resolve your GitHub user.", fetchedAt };
    }
  }

  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=10`,
    { headers, cache: "no-store" },
  );
  if (!res.ok) {
    return {
      ok: false,
      message: `GitHub: ${res.status} ${res.statusText}.`,
      fetchedAt,
      detail: `@${username}`,
    };
  }
  const events = await res.json();
  const items = (Array.isArray(events) ? events : [])
    .map(describeEvent)
    .filter((x): x is DataSourceItem => x !== null)
    .slice(0, 6);
  return {
    ok: true,
    message: `@${username}`,
    fetchedAt,
    detail: items.length ? undefined : "No recent public activity.",
    items,
  };
}

type GithubEvent = {
  type?: string;
  repo?: { name?: string };
  payload?: { commits?: unknown[]; action?: string; ref_type?: string };
};

function describeEvent(e: GithubEvent): DataSourceItem | null {
  const repo = e?.repo?.name;
  const url = repo ? `https://github.com/${repo}` : undefined;
  switch (e?.type) {
    case "PushEvent": {
      const n = e.payload?.commits?.length ?? 0;
      return { label: `Pushed ${n} commit${n === 1 ? "" : "s"}`, sub: repo, url };
    }
    case "PullRequestEvent":
      return {
        label: `${e.payload?.action === "closed" ? "Closed" : "Opened"} a PR`,
        sub: repo,
        url,
      };
    case "IssuesEvent":
      return { label: `${e.payload?.action ?? "Updated"} an issue`, sub: repo, url };
    case "CreateEvent":
      return { label: `Created ${e.payload?.ref_type ?? "a ref"}`, sub: repo, url };
    case "WatchEvent":
      return { label: "Starred", sub: repo, url };
    case "ForkEvent":
      return { label: "Forked", sub: repo, url };
    case "IssueCommentEvent":
      return { label: "Commented", sub: repo, url };
    default:
      return repo
        ? { label: (e.type ?? "Activity").replace(/Event$/, ""), sub: repo, url }
        : null;
  }
}

async function fetchSteam(
  config: unknown,
  fetchedAt: string,
): Promise<DataSourceResult> {
  const cfg = (config ?? {}) as SteamConfig;
  const steamId = cfg.steamId?.trim();
  const key = process.env.STEAM_API_KEY;
  if (!key) {
    return {
      ok: false,
      message: "Set STEAM_API_KEY to enable.",
      fetchedAt,
      detail: steamId ? `Steam ID ${steamId}` : undefined,
    };
  }
  if (!steamId) {
    return { ok: false, message: "Add your Steam ID in settings.", fetchedAt };
  }
  const res = await fetch(
    `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${key}&steamid=${encodeURIComponent(
      steamId,
    )}&count=6`,
    { cache: "no-store" },
  );
  if (!res.ok) return { ok: false, message: `Steam: ${res.status}.`, fetchedAt };
  const json = await res.json();
  const games: { name: string; playtime_2weeks?: number }[] =
    json?.response?.games ?? [];
  const items: DataSourceItem[] = games.map((g) => ({
    label: g.name,
    sub: `${Math.round(((g.playtime_2weeks ?? 0) / 60) * 10) / 10}h in 2 weeks`,
  }));
  return {
    ok: true,
    message: "Recently played",
    fetchedAt,
    detail: items.length ? undefined : "No recent play.",
    items,
  };
}
