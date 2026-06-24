import type { Transcript } from "@/lib/types";

/** The readable digest: summary, the exhaustive point-by-point breakdown, and
 * takeaways — the primary view for understanding a post (raw transcript is secondary). */
export function TranscriptBreakdown({ t }: { t: Transcript }) {
  const keyPoints = t.key_points ?? [];
  const takeaways = t.takeaways ?? [];
  const hasDigest = Boolean(t.summary) || keyPoints.length > 0 || takeaways.length > 0;

  if (!hasDigest) {
    return (
      <p className="text-sm text-muted-foreground">
        No summary yet for this post — re-run the instascrape transcription (with
        summaries on), then <code>npm run sync</code>.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {t.summary && (
        <section className="space-y-1.5">
          <h2 className="text-sm font-semibold">Summary</h2>
          <p className="text-sm leading-relaxed text-foreground/80">{t.summary}</p>
        </section>
      )}

      {keyPoints.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            Breakdown{" "}
            <span className="font-normal text-muted-foreground">
              · {keyPoints.length} points
            </span>
          </h2>
          <ol className="space-y-2.5">
            {keyPoints.map((p, i) => (
              <li
                key={i}
                className="rounded-lg border border-foreground/10 bg-card p-3"
              >
                <div className="flex gap-2.5">
                  <span className="select-none text-sm font-semibold tabular-nums text-muted-foreground">
                    {i + 1}.
                  </span>
                  <div className="min-w-0 space-y-1">
                    {p.point && <div className="text-sm font-medium">{p.point}</div>}
                    {p.detail && (
                      <p className="text-sm leading-relaxed text-foreground/75">
                        {p.detail}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {takeaways.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Takeaways</h2>
          <ul className="space-y-1.5">
            {takeaways.map((tk, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/80">
                <span className="select-none text-muted-foreground">•</span>
                <span>{tk}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
