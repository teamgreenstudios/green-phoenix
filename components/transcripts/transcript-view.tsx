import { cn } from "@/lib/utils";

type Entry = { time: string | null; kind: "audio" | "screen" | null; text: string };

const HEAD = /^\s*\[\s*([\d.]+)\]\s*\((audio|screen)\)\s?(.*)$/;

function fmtTime(s: string): string {
  const sec = Math.floor(parseFloat(s));
  const m = Math.floor(sec / 60);
  const ss = sec % 60;
  return `${m}:${ss.toString().padStart(2, "0")}`;
}

/** Parse the merged transcript into entries; unprefixed lines (e.g. multi-line
 * screen/markdown blocks) fold into the preceding entry. */
function parse(content: string): Entry[] {
  const entries: Entry[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const m = raw.match(HEAD);
    if (m) {
      entries.push({ time: fmtTime(m[1]), kind: m[2] as Entry["kind"], text: m[3] });
    } else if (entries.length) {
      const last = entries[entries.length - 1];
      last.text += (last.text ? "\n" : "") + raw;
    } else if (raw.trim()) {
      entries.push({ time: null, kind: null, text: raw });
    }
  }
  // Trim trailing blank lines that folded into the last entry.
  for (const e of entries) e.text = e.text.replace(/\s+$/, "");
  return entries;
}

/** Read-only viewer: timestamped lines, (screen) rows tinted + labelled. */
export function TranscriptView({ content }: { content: string }) {
  const entries = parse(content);
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">Empty transcript.</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl border border-foreground/10">
      <ul className="divide-y divide-foreground/5">
        {entries.map((e, i) => (
          <li
            key={i}
            className={cn(
              "flex gap-3 px-4 py-2 text-sm",
              e.kind === "screen" && "bg-muted/40",
            )}
          >
            <span className="w-10 shrink-0 pt-0.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {e.time ?? ""}
            </span>
            <span
              className={cn(
                "w-12 shrink-0 pt-1 text-[10px] font-medium uppercase tracking-wide",
                e.kind === "screen"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
              )}
            >
              {e.kind ?? ""}
            </span>
            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">
              {e.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
