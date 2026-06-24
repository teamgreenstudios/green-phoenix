import Link from "next/link";
import { FileText, Film, Images, Image as ImageIcon } from "lucide-react";
import type { TranscriptListItem } from "@/lib/types";

const TYPE_ICON = { reel: Film, carousel: Images, image: ImageIcon } as const;

function typeLabel(t: TranscriptListItem): string | null {
  if (!t.post_type) return null;
  if (t.post_type === "carousel" && t.n_slides) return `carousel · ${t.n_slides}`;
  return t.post_type;
}

/** One tile in the transcripts list: headline + summary + a couple of takeaways,
 * linking to the full breakdown. Summary-first so the list is scannable. */
export function TranscriptCard({ t }: { t: TranscriptListItem }) {
  // ISO date slice is deterministic (no Date() → no hydration mismatch).
  const date = t.scraped_at?.slice(0, 10) ?? null;
  const Icon =
    (t.post_type && TYPE_ICON[t.post_type as keyof typeof TYPE_ICON]) || FileText;
  const label = typeLabel(t);
  const takeaways = t.takeaways ?? [];

  return (
    <li>
      <Link
        href={`/transcripts/${t.external_id}`}
        className="block rounded-xl border border-foreground/10 bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="line-clamp-2 font-medium">
              {t.headline || t.title || t.external_id}
            </div>
            {t.summary && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{t.summary}</p>
            )}
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-foreground/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            <Icon className="size-3" />
            {label ?? "post"}
          </span>
        </div>

        {takeaways.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {takeaways.slice(0, 2).map((tk, i) => (
              <span
                key={i}
                className="max-w-full truncate rounded-md bg-muted px-2 py-0.5 text-xs text-foreground/70"
              >
                {tk}
              </span>
            ))}
            {takeaways.length > 2 && (
              <span className="px-1 py-0.5 text-xs text-muted-foreground">
                +{takeaways.length - 2} more
              </span>
            )}
          </div>
        )}

        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-mono">{t.external_id}</span>
          {date && <> · {date}</>}
          {t.line_count != null && <> · {t.line_count} lines</>}
        </div>
      </Link>
    </li>
  );
}
