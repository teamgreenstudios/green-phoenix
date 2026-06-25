import { createClient } from "@/lib/supabase/server";
import type { PromptListItem } from "@/lib/types";
import { TranscriptsRefresh } from "@/components/transcripts/transcripts-refresh";
import { PromptsBrowser } from "@/components/prompts/prompts-browser";

const LIST_COLS =
  "id,external_id,transcript_external_id,source_url,title,content,target_tool,category,tags,hidden,created_at,updated_at";

export default async function PromptsPage() {
  const supabase = await createClient();
  // RLS scopes to the signed-in user. Mirrored from instascrape by `npm run sync`.
  // Hidden prompts are fetched too so the browser can offer a "Show hidden" / restore view.
  const { data } = await supabase
    .from("prompts")
    .select(LIST_COLS)
    .order("created_at", { ascending: false, nullsFirst: false })
    .returns<PromptListItem[]>();
  const prompts = data ?? [];
  const lastUpdated = prompts.length
    ? prompts.reduce(
        (m, p) => (p.updated_at > m ? p.updated_at : m),
        prompts[0].updated_at,
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Prompts</h1>
          <p className="text-sm text-muted-foreground">
            Copy-paste prompts extracted from the scraped posts — categorized and tagged so you
            can find one for any scenario. Mirrored from instascrape (<code>npm run sync</code>);
            hide ones you don&apos;t want — the rest stays in sync.
          </p>
        </div>
        {prompts.length > 0 && <TranscriptsRefresh lastUpdated={lastUpdated} />}
      </div>

      {prompts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 py-12 text-center text-sm text-muted-foreground">
          No prompts yet. Run an instascrape transcription, then{" "}
          <code>npm run sync</code> to mirror them here.
        </div>
      ) : (
        <PromptsBrowser items={prompts} />
      )}
    </div>
  );
}
