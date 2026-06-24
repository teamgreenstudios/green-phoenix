import Link from "next/link";
import { FileText } from "lucide-react";
import type { Transcript } from "@/lib/types";

/** One row in the transcripts list — links to the full viewer. */
export function TranscriptCard({ t }: { t: Transcript }) {
  // ISO date slice is deterministic (no Date() → no hydration mismatch).
  const date = t.scraped_at?.slice(0, 10) ?? null;
  return (
    <li>
      <Link
        href={`/transcripts/${t.external_id}`}
        className="block rounded-xl border border-foreground/10 bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-medium">
              {t.title || t.external_id}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-mono">{t.external_id}</span>
              {date && <> · {date}</>}
              {t.line_count != null && <> · {t.line_count} lines</>}
            </div>
          </div>
          <FileText className="size-4 shrink-0 text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
}
