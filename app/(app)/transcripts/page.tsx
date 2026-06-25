import { createClient } from "@/lib/supabase/server";
import type { TranscriptListItem } from "@/lib/types";
import { TranscriptsRefresh } from "@/components/transcripts/transcripts-refresh";
import { TranscriptsOverview } from "@/components/transcripts/transcripts-overview";
import { TranscriptsBrowser } from "@/components/transcripts/transcripts-browser";

const LIST_COLS =
  "id,external_id,url,title,headline,summary,takeaways,key_points,tags,refs,post_type,n_slides,line_count,scraped_at,updated_at";

export default async function TranscriptsPage() {
  const supabase = await createClient();
  // RLS scopes to the signed-in user. Mirrored from instascrape by `npm run sync`.
  // Tile projection only — the heavy `content` is fetched on the detail page.
  const { data } = await supabase
    .from("transcripts")
    .select(LIST_COLS)
    .order("scraped_at", { ascending: false, nullsFirst: false })
    .returns<TranscriptListItem[]>();
  const transcripts = data ?? [];
  // Freshness hint = the most recent row change (the sync bumps updated_at).
  const lastUpdated = transcripts.length
    ? transcripts.reduce(
        (m, t) => (t.updated_at > m ? t.updated_at : m),
        transcripts[0].updated_at,
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Transcripts</h1>
          <p className="text-sm text-muted-foreground">
            Instagram post summaries from instascrape — headline, takeaways, and a
            full breakdown, with the raw transcript a click away. Read-only — scrape
            in instascrape, then run <code>npm run sync</code>.
          </p>
        </div>
        {transcripts.length > 0 && (
          <TranscriptsRefresh lastUpdated={lastUpdated} />
        )}
      </div>

      {transcripts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 py-12 text-center text-sm text-muted-foreground">
          No transcripts yet. Run an instascrape transcription, then{" "}
          <code>npm run sync</code> to mirror it here.
        </div>
      ) : (
        <>
          <TranscriptsOverview items={transcripts} />
          <TranscriptsBrowser items={transcripts} />
        </>
      )}
    </div>
  );
}
