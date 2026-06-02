"use client";

import { useRouter } from "next/navigation";
import { useRealtimeTable } from "@/lib/hooks/use-realtime";

/**
 * Invisible helper: re-fetches the current (server-rendered) projects route when
 * the user's projects change elsewhere. The projects pages have no client-side
 * list state, so a route refresh is the cleanest way to stay live.
 */
export function RealtimeProjects() {
  const router = useRouter();
  useRealtimeTable("projects", () => router.refresh());
  return null;
}
