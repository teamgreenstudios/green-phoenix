"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Small building blocks shared by tile config forms (spec §6 "nicer config forms").
 * Keeps every form's field layout and the add/remove link editor consistent.
 */

/** A labelled form field: label on top, control, optional helper text below. */
export function Field({
  label,
  htmlFor,
  description,
  children,
}: {
  label: string;
  htmlFor?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

/** Minimum shape the editor reads/writes; extra fields on items are preserved. */
export type LinkItem = { label: string; url: string };

/**
 * Reusable editor for a list of `{ label, url }` items (launcher + bookmarks).
 * Generic so callers keep their own item type (extra keys are spread through).
 */
export function LinkItemsEditor<T extends LinkItem>({
  items,
  onChange,
  label = "Links",
  addLabel = "Add link",
}: {
  items: T[];
  onChange: (next: T[]) => void;
  label?: string;
  addLabel?: string;
}) {
  const update = (i: number, patch: Partial<LinkItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Label"
            value={item.label}
            onChange={(e) => update(i, { label: e.target.value })}
            aria-label={`${label} ${i + 1} label`}
          />
          <Input
            placeholder="https://…"
            value={item.url}
            onChange={(e) => update(i, { url: e.target.value })}
            aria-label={`${label} ${i + 1} URL`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, { label: "", url: "" } as T])}
      >
        <Plus className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}
