"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format-time";
import { useMounted } from "@/lib/hooks/use-mounted";

/**
 * Re-queries the latest synced transcripts from Supabase via router.refresh().
 * Does NOT read the local files (that's `npm run sync`); this reflects whatever
 * the last sync wrote. Relative time renders only after mount (server "now" !=
 * client "now") to avoid a hydration mismatch.
 */
export function TranscriptsRefresh({
  lastUpdated,
}: {
  lastUpdated?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const mounted = useMounted();

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
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        title="Re-query the latest synced data"
      >
        <RefreshCw className={cn("mr-1.5 size-3.5", pending && "animate-spin")} />
        {pending ? "Refreshing…" : "Refresh"}
      </Button>
    </div>
  );
}
