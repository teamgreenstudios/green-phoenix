"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import type { TranscriptListItem } from "@/lib/types";
import { TranscriptCard } from "@/components/transcripts/transcripts-list";

type SortKey = "recent" | "oldest" | "title";
const TYPES = ["reel", "image", "carousel"] as const;
type TypeFilter = "all" | (typeof TYPES)[number];

// One lowercase blob per item to match against — covers the full digest
// (headline, summary, takeaways, AND every key_point) so search reaches a point
// that only appears in one slide's breakdown.
function haystack(t: TranscriptListItem): string {
  return [
    t.headline ?? "",
    t.title ?? "",
    t.summary ?? "",
    t.external_id,
    ...(t.takeaways ?? []),
    ...(t.key_points ?? []).flatMap((p) => [p.point, p.detail]),
  ]
    .join(" \n ")
    .toLowerCase();
}

function sortTitle(t: TranscriptListItem): string {
  return t.headline || t.title || t.external_id;
}

export function TranscriptsBrowser({ items }: { items: TranscriptListItem[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");

  // Only offer type filters that actually appear in the data.
  const presentTypes = useMemo(() => {
    const s = new Set(
      items.map((t) => t.post_type).filter(Boolean) as string[],
    );
    return TYPES.filter((t) => s.has(t));
  }, [items]);

  // All tags across the corpus, most-used first.
  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of items)
      for (const tg of t.tags ?? []) counts.set(tg, (counts.get(tg) ?? 0) + 1);
    return [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [items]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = items.filter((t) => {
      if (type !== "all" && t.post_type !== type) return false;
      if (tag && !(t.tags ?? []).includes(tag)) return false;
      if (needle && !haystack(t).includes(needle)) return false;
      return true;
    });
    out.sort((a, b) => {
      if (sort === "title") return sortTitle(a).localeCompare(sortTitle(b));
      const av = a.scraped_at ?? "";
      const bv = b.scraped_at ?? "";
      return sort === "oldest" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return out;
  }, [items, q, type, tag, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search headline, summary, takeaways, breakdown…"
            className="w-full rounded-lg border border-foreground/10 bg-card py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/25"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort transcripts"
          className="rounded-lg border border-foreground/10 bg-card px-2 py-2 text-sm text-muted-foreground outline-none focus:border-foreground/25"
        >
          <option value="recent">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      {presentTypes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill active={type === "all"} onClick={() => setType("all")}>
            All <span className="text-muted-foreground">{items.length}</span>
          </FilterPill>
          {presentTypes.map((tp) => (
            <FilterPill
              key={tp}
              active={type === tp}
              onClick={() => setType(tp)}
            >
              <span className="capitalize">{tp}</span>{" "}
              <span className="text-muted-foreground">
                {items.filter((t) => t.post_type === tp).length}
              </span>
            </FilterPill>
          ))}
        </div>
      )}

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {allTags.map(([tg, n]) => (
            <FilterPill
              key={tg}
              active={tag === tg}
              onClick={() => setTag(tag === tg ? null : tg)}
            >
              #{tg} <span className="text-muted-foreground">{n}</span>
            </FilterPill>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 py-10 text-center text-sm text-muted-foreground">
          No posts match your search.
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {shown.length === items.length
              ? `${items.length} posts`
              : `${shown.length} of ${items.length}`}
          </p>
          <ul className="grid gap-3">
            {shown.map((t) => (
              <TranscriptCard key={t.id} t={t} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-2.5 py-1 text-xs transition-colors " +
        (active
          ? "border-foreground/25 bg-muted font-medium"
          : "border-foreground/10 text-muted-foreground hover:border-foreground/20")
      }
    >
      {children}
    </button>
  );
}
