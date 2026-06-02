"use client";

import { useEffect, useId, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type ChangePayload = RealtimePostgresChangesPayload<{ [key: string]: unknown }>;

/**
 * Subscribe to Postgres changes on a table and invoke `onChange` for each
 * INSERT / UPDATE / DELETE. RLS scopes events to the signed-in user's rows.
 *
 * Inert until Realtime replication is enabled for the table in Supabase
 * (Database → Publications → `supabase_realtime`). Safe to mount beforehand —
 * it simply receives no events until then.
 */
export function useRealtimeTable(
  table: string,
  onChange: (payload: ChangePayload) => void,
  enabled = true,
) {
  // Keep the latest callback without forcing a re-subscribe each render.
  const cb = useRef(onChange);
  cb.current = onChange;
  const channelId = useId();

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`rt:${table}:${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => cb.current(payload),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, channelId, enabled]);
}
