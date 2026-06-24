import type { TranscriptListItem } from "@/lib/types";

// One labelled mini-bar (label · count, with a proportional fill).
function Bar({ label, n, max }: { label: string; n: number; max: number }) {
  const w = max ? Math.round((n / max) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate">{label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{n}</span>
      </div>
      <div className="h-1.5 rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-foreground/40"
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}

function countBy<T>(items: T[], key: (t: T) => string | null | undefined) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// Distinct values across all items, counted by how many POSTS contain each.
function countByPost<T>(items: T[], values: (t: T) => string[]) {
  const m = new Map<string, number>();
  for (const it of items) {
    for (const v of new Set(values(it))) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** Read-only bird's-eye summary of the whole corpus: format mix, top topics, top
 * tools, and CTA patterns (derived from reference kinds). No filtering — that's the
 * browser below. */
export function TranscriptsOverview({ items }: { items: TranscriptListItem[] }) {
  const total = items.length;
  if (!total) return null;

  const byType = countBy(items, (t) => t.post_type ?? "other");
  const carousels = items.filter((t) => t.post_type === "carousel");
  const avgSlides = carousels.length
    ? Math.round(
        carousels.reduce((s, t) => s + (t.n_slides ?? 0), 0) / carousels.length,
      )
    : 0;
  const dates = items
    .map((t) => t.scraped_at?.slice(0, 10))
    .filter(Boolean)
    .sort() as string[];
  const span = dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : "—";

  const topTags = countByPost(items, (t) => t.tags ?? []).slice(0, 8);
  const topRefs = countByPost(items, (t) =>
    (t.refs ?? []).map((r) => r.name.toLowerCase()),
  ).slice(0, 8);

  // CTA patterns: how many posts carry an off-platform link / promo code / handle.
  const ctaPosts = (kind: string) =>
    items.filter((t) => (t.refs ?? []).some((r) => r.kind === kind)).length;
  const ctas = [
    { label: "Off-platform link", n: ctaPosts("link") },
    { label: "Promo code", n: ctaPosts("code") },
    { label: "Handle / follow", n: ctaPosts("handle") },
  ].filter((c) => c.n > 0);

  return (
    <details
      open
      className="rounded-xl border border-foreground/10 bg-card [&[open]>summary]:border-b [&[open]>summary]:border-foreground/10"
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
        Patterns overview{" "}
        <span className="font-normal text-muted-foreground">· {total} posts</span>
      </summary>

      <div className="grid gap-6 p-4 sm:grid-cols-3">
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Format
          </h3>
          {byType.map(([t, n]) => (
            <Bar key={t} label={t} n={n} max={total} />
          ))}
          <p className="pt-1 text-xs text-muted-foreground">
            avg {avgSlides} slides/carousel · {span}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top topics
          </h3>
          {topTags.length ? (
            topTags.map(([tag, n]) => (
              <Bar key={tag} label={tag} n={n} max={topTags[0][1]} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">none</p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top tools / links
          </h3>
          {topRefs.length ? (
            topRefs.map(([name, n]) => (
              <Bar key={name} label={name} n={n} max={topRefs[0][1]} />
            ))
          ) : (
            <p className="text-xs text-muted-foreground">none</p>
          )}
          {ctas.length > 0 && (
            <p className="pt-1 text-xs text-muted-foreground">
              CTAs:{" "}
              {ctas.map((c, i) => (
                <span key={c.label}>
                  {i > 0 && " · "}
                  {c.label} {c.n}
                </span>
              ))}
            </p>
          )}
        </section>
      </div>
    </details>
  );
}
