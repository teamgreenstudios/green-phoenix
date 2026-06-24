import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Transcript } from "@/lib/types";
import { TranscriptView } from "@/components/transcripts/transcript-view";
import { TranscriptBreakdown } from "@/components/transcripts/transcript-breakdown";

export default async function TranscriptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS scopes to the signed-in user; external_id is the post shortcode.
  const { data } = await supabase
    .from("transcripts")
    .select("*")
    .eq("external_id", id)
    .limit(1)
    .returns<Transcript[]>();
  const transcript = data?.[0];
  if (!transcript) notFound();

  const typeLabel =
    transcript.post_type === "carousel" && transcript.n_slides
      ? `carousel · ${transcript.n_slides} slides`
      : transcript.post_type;

  return (
    <div className="space-y-5">
      <Link
        href="/transcripts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Transcripts
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {transcript.headline || transcript.title || transcript.external_id}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-mono">{transcript.external_id}</span>
          {typeLabel && <span>{typeLabel}</span>}
          {transcript.scraped_at && (
            <span>scraped {transcript.scraped_at.slice(0, 10)}</span>
          )}
          {transcript.line_count != null && (
            <span>{transcript.line_count} lines</span>
          )}
          {transcript.url && (
            <a
              href={transcript.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="size-3" /> Instagram
            </a>
          )}
        </div>
      </div>

      <TranscriptBreakdown t={transcript} />

      <details className="group rounded-xl border border-foreground/10">
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
          Raw transcript
        </summary>
        <div className="border-t border-foreground/10 p-3">
          <TranscriptView content={transcript.content ?? ""} />
        </div>
      </details>
    </div>
  );
}
