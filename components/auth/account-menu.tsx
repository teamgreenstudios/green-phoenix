"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LogOut, Upload, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createTile, exportTiles } from "@/app/(app)/tiles/actions";

export function AccountMenu({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function signOut() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function handleExport() {
    const res = await exportTiles();
    if (res.error || !res.data) {
      toast.error(res.error ?? "Export failed.");
      return;
    }
    const payload = {
      version: 1,
      tiles: res.data.map((t) => ({
        type: t.type,
        title: t.title,
        config: t.config,
        size: t.size,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dashboard-tiles.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const json = JSON.parse(await file.text());
      const tiles = Array.isArray(json) ? json : json?.tiles;
      if (!Array.isArray(tiles)) {
        toast.error("That file doesn't look like a tile export.");
        return;
      }
      let ok = 0;
      for (const t of tiles) {
        if (!t || typeof t.type !== "string") continue;
        const res = await createTile({
          type: t.type,
          title: t.title ?? null,
          config: t.config ?? {},
          size: t.size,
        });
        if (!res.error) ok++;
      }
      toast.success(`Imported ${ok} tile${ok === 1 ? "" : "s"}.`);
      if (ok > 0) location.reload();
    } catch {
      toast.error("Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImport}
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label="Account menu" />
          }
        >
          <UserIcon className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="truncate px-1.5 py-1 text-xs text-muted-foreground">
            {email}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExport}>
            <Download className="size-4" />
            Export tiles
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            {busy ? "Importing…" : "Import tiles"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={loading} onClick={signOut}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
