"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Check, Pencil, StickyNote, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { NotesConfig } from "@/lib/types";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";
import { Field } from "../config-fields";
import { updateTile } from "@/app/(app)/tiles/actions";

function asConfig(config: unknown): NotesConfig {
  const c = (config ?? {}) as Partial<NotesConfig>;
  return { markdown: typeof c.markdown === "string" ? c.markdown : "" };
}

// Markdown typography via scoped variants (no typography plugin). Uses theme
// tokens so it adapts to light/dark automatically.
const PROSE =
  "text-sm leading-relaxed break-words " +
  "[&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:first:mt-0 " +
  "[&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-sm [&_h2]:font-semibold " +
  "[&_h3]:mt-2 [&_h3]:font-semibold [&_p]:my-2 [&_p]:first:mt-0 " +
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 " +
  "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold " +
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs " +
  "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 " +
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 " +
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground " +
  "[&_hr]:my-3 [&_hr]:border-border " +
  // GFM: tables, strikethrough, task lists.
  "[&_table]:my-2 [&_table]:block [&_table]:w-fit [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:text-xs " +
  "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold " +
  "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 " +
  "[&_del]:text-muted-foreground [&_del]:line-through " +
  "[&_li:has(>input)]:list-none [&_li:has(>input)]:-ml-5 [&_input]:mr-1.5 [&_input]:align-middle";

function NotesRenderer({ id, config, onConfigSaved }: TileRendererProps) {
  const { markdown } = asConfig(config);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(markdown);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setDraft(markdown);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    const res = await updateTile(id, { config: { markdown: draft } });
    setSaving(false);
    if (res.error || !res.data) {
      toast.error(res.error ?? "Failed to save notes.");
      return;
    }
    onConfigSaved?.(res.data.config);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="grid gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={8}
          placeholder="Write markdown…"
          aria-label="Notes markdown"
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            <X className="size-4" />
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={save} disabled={saving}>
            <Check className="size-4" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Edit notes"
        className="absolute -top-1 right-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={startEditing}
      >
        <Pencil className="size-3.5" />
      </Button>
      {markdown.trim() ? (
        <div className={PROSE}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          No notes yet. Click to add some.
        </button>
      )}
    </div>
  );
}

function NotesConfigForm({ value, onChange }: TileConfigFormProps) {
  const { markdown } = asConfig(value);
  return (
    <Field
      label="Markdown"
      htmlFor="notes-md"
      description="Supports headings, **bold**, *italic*, lists, links, and `code`."
    >
      <Textarea
        id="notes-md"
        value={markdown}
        onChange={(e) => onChange({ markdown: e.target.value })}
        rows={8}
        placeholder="Write markdown…"
      />
    </Field>
  );
}

export const notesDef: TileDefinition = {
  type: "notes",
  label: "Notes",
  description: "A markdown scratchpad you can edit inline.",
  icon: StickyNote,
  defaultTitle: "Notes",
  defaultConfig: { markdown: "" } satisfies NotesConfig,
  Renderer: NotesRenderer,
  ConfigForm: NotesConfigForm,
};
