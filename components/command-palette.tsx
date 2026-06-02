"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import {
  Activity,
  CheckSquare,
  FileText,
  LayoutGrid,
  type LucideIcon,
  MoonStar,
  Search,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { loadCommandData, type CommandData } from "@/app/(app)/command/actions";

const EMPTY: CommandData = { projects: [], todos: [], notes: [] };

export function CommandPalette() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CommandData>(EMPTY);
  const [loading, setLoading] = useState(false);

  // Global ⌘K / Ctrl-K toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Refresh the searchable set each time the palette opens.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    loadCommandData()
      .then((d) => active && setData(d))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="flex h-8 items-center gap-2 rounded-md border border-input bg-transparent px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border border-border bg-muted px-1 font-sans text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Command palette</DialogTitle>
          <Command
            loop
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder="Search or jump to…"
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-1.5">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                {loading ? "Loading…" : "No results."}
              </Command.Empty>

              <Command.Group heading="Go to">
                <Item icon={LayoutGrid} onSelect={() => go("/")}>
                  Overview
                </Item>
                <Item icon={Activity} onSelect={() => go("/projects")}>
                  Projects
                </Item>
                <Item icon={CheckSquare} onSelect={() => go("/todos")}>
                  Todos
                </Item>
              </Command.Group>

              <Command.Group heading="Actions">
                <Item
                  icon={MoonStar}
                  value="toggle theme dark light mode"
                  onSelect={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                >
                  Toggle light / dark theme
                </Item>
              </Command.Group>

              {data.projects.length > 0 && (
                <Command.Group heading="Projects">
                  {data.projects.map((p) => (
                    <Item
                      key={p.id}
                      icon={Activity}
                      value={`project ${p.name}`}
                      onSelect={() => go(`/projects/${p.id}`)}
                    >
                      {p.name}
                    </Item>
                  ))}
                </Command.Group>
              )}

              {data.todos.length > 0 && (
                <Command.Group heading="Todos">
                  {data.todos.map((t) => (
                    <Item
                      key={t.id}
                      icon={CheckSquare}
                      value={`todo ${t.title}`}
                      onSelect={() =>
                        go(t.project_id ? `/projects/${t.project_id}` : "/todos")
                      }
                    >
                      {t.title}
                    </Item>
                  ))}
                </Command.Group>
              )}

              {data.notes.length > 0 && (
                <Command.Group heading="Notes">
                  {data.notes.map((n) => (
                    <Item
                      key={n.id}
                      icon={FileText}
                      value={`note ${n.title ?? ""} ${n.text}`}
                      onSelect={() => go("/")}
                    >
                      {n.title || n.text.slice(0, 40) || "Untitled note"}
                    </Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Item({
  icon: Icon,
  value,
  onSelect,
  children,
}: {
  icon: LucideIcon;
  value?: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{children}</span>
    </Command.Item>
  );
}
