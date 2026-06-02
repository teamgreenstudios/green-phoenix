"use client";

import { Bookmark, ExternalLink } from "lucide-react";
import type { BookmarkItem, BookmarksConfig } from "@/lib/types";
import type {
  TileConfigFormProps,
  TileDefinition,
  TileRendererProps,
} from "../types";
import { LinkItemsEditor } from "../config-fields";

function asConfig(config: unknown): BookmarksConfig {
  const c = (config ?? {}) as Partial<BookmarksConfig>;
  return { items: Array.isArray(c.items) ? c.items : [] };
}

function BookmarksRenderer({ config }: TileRendererProps) {
  const { items } = asConfig(config);
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No bookmarks yet. Edit this tile to add some.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, i) => (
        <li key={i}>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{item.label || item.url}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function BookmarksConfigForm({ value, onChange }: TileConfigFormProps) {
  const { items } = asConfig(value);
  return (
    <LinkItemsEditor
      items={items}
      onChange={(next: BookmarkItem[]) => onChange({ items: next })}
      label="Bookmarks"
      addLabel="Add bookmark"
    />
  );
}

export const bookmarksDef: TileDefinition = {
  type: "bookmarks",
  label: "Bookmarks",
  description: "A compact list of saved links.",
  icon: Bookmark,
  defaultTitle: "Bookmarks",
  defaultConfig: { items: [] } satisfies BookmarksConfig,
  Renderer: BookmarksRenderer,
  ConfigForm: BookmarksConfigForm,
};
