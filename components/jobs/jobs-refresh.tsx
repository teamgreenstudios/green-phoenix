"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format-time";

/**
 * Re-queries the latest synced jobs from Supabase via router.refresh() — re-runs
 * the page's server component without a full reload. Does NOT read jobs.json
 * (that's the local `npm run sync`); this reflects whatever the last sync wrote.
 *
 * `compact` renders just an icon button (for the dashboard tile); otherwise it
 * shows an "Updated <relative>" freshness hint + a labelled button (for /jobs).
 */
export function JobsRefresh({
  lastUpdated,
  compact = false,
}: {
  lastUpdated?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Only show relative time after mount — see the hydration note in the
  // accompanying explanation (server "now" != client "now").
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const refresh = () => startTransition(() => router.refresh());

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={refresh}
        disabled={pending}
        aria-label="Refresh jobs"
        title="Refresh from the database"
      >
        <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {mounted && lastUpdated && (
        <span className="text-xs text-muted-foreground">
          Updated {formatRelativeTime(lastUpdated)}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={refresh}
        disabled={pending}
        title="Re-query the latest synced data"
      >
        <RefreshCw className={cn("mr-1.5 size-3.5", pending && "animate-spin")} />
        {pending ? "Refreshing…" : "Refresh"}
      </Button>
    </div>
  );
}
