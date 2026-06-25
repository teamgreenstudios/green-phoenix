"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Search, Copy, Check, ExternalLink } from "lucide-react";
import type { PromptListItem } from "@/lib/types";

type SortKey = "recent" | "oldest" | "title";

function haystack(p: PromptListItem): string {
  return [p.title ?? "", p.content ?? "", p.category ?? "", ...(p.tags ?? [])]
    .join(" \n ")
    .toLowerCase();
}

function countBy(items: PromptListItem[], key: (p: PromptListItem) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function PromptsBrowser({ items }: { items: PromptListItem[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [tool, setTool] = useState<string | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");

  const categories = useMemo(() => countBy(items, (p) => p.category), [items]);
  const tools = useMemo(() => countBy(items, (p) => p.target_tool), [items]);
  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of items)
      for (const t of new Set(p.tags ?? [])) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = items.filter((p) => {
      if (category && p.category !== category) return false;
      if (tool && p.target_tool !== tool) return false;
      if (tag && !(p.tags ?? []).includes(tag)) return false;
      if (needle && !haystack(p).includes(needle)) return false;
      return true;
    });
    out.sort((a, b) => {
      if (sort === "title")
        return (a.title || "").localeCompare(b.title || "");
      const av = a.created_at ?? "";
      const bv = b.created_at ?? "";
      return sort === "oldest" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return out;
  }, [items, q, category, tool, tag, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search prompts — title, text, tags…"
            className="w-full rounded-lg border border-foreground/10 bg-card py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-foreground/25"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort prompts"
          className="rounded-lg border border-foreground/10 bg-card px-2 py-2 text-sm text-muted-foreground outline-none focus:border-foreground/25"
        >
          <option value="recent">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      <FilterRow label="Category">
        <FilterPill active={!category} onClick={() => setCategory(null)}>
          All <span className="text-muted-foreground">{items.length}</span>
        </FilterPill>
        {categories.map(([c, n]) => (
          <FilterPill key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
            {c} <span className="text-muted-foreground">{n}</span>
          </FilterPill>
        ))}
      </FilterRow>

      {tools.length > 1 && (
        <FilterRow label="Tool">
          {tools.map(([t, n]) => (
            <FilterPill key={t} active={tool === t} onClick={() => setTool(tool === t ? null : t)}>
              {t} <span className="text-muted-foreground">{n}</span>
            </FilterPill>
          ))}
        </FilterRow>
      )}

      {allTags.length > 0 && (
        <FilterRow label="Tags">
          {allTags.slice(0, 24).map(([t, n]) => (
            <FilterPill key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
              {t} <span className="text-muted-foreground">{n}</span>
            </FilterPill>
          ))}
          {allTags.length > 24 && (
            <span className="px-1 text-xs text-muted-foreground">
              +{allTags.length - 24} more — search to find them
            </span>
          )}
        </FilterRow>
      )}

      <p className="text-xs text-muted-foreground">
        {shown.length === items.length
          ? `${items.length} prompts`
          : `${shown.length} of ${items.length}`}
      </p>

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 py-10 text-center text-sm text-muted-foreground">
          No prompts match your filters.
        </div>
      ) : (
        <ul className="grid gap-3">
          {shown.map((p) => (
            <PromptCard key={p.id} p={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PromptCard({ p }: { p: PromptListItem }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = p.content ?? "";
  const long = text.length > 320;

  const copy = () => {
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };

  return (
    <li className="rounded-xl border border-foreground/10 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{p.title || "Untitled prompt"}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            {p.category && (
              <span className="rounded-full border border-foreground/15 px-2 py-0.5 uppercase tracking-wide text-muted-foreground">
                {p.category}
              </span>
            )}
            {p.target_tool && p.target_tool !== "any" && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-foreground/70">
                {p.target_tool}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-foreground/15 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          title="Copy prompt"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <pre
        className={
          "mt-3 whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 font-mono text-xs leading-relaxed text-foreground/80" +
          (long && !expanded ? " line-clamp-6" : "")
        }
      >
        {text}
      </pre>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(p.tags ?? []).map((t) => (
          <span key={t} className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground/70">
            {t}
          </span>
        ))}
      </div>

      {p.transcript_external_id && (
        <div className="mt-3 text-xs text-muted-foreground">
          <Link
            href={`/transcripts/${p.transcript_external_id}`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ExternalLink className="size-3" /> source: {p.transcript_external_id}
          </Link>
        </div>
      )}
    </li>
  );
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-xs font-medium text-muted-foreground">{label}:</span>
      {children}
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
