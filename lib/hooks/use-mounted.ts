"use client";

import { useSyncExternalStore } from "react";

// Stable no-op subscription: the "mounted" value never changes after hydration, so there's
// nothing to subscribe to.
const subscribe = () => () => {};

/**
 * `true` only after client hydration; `false` during SSR and the initial hydration render.
 *
 * Replaces the `useState(false)` + `useEffect(() => setMounted(true), [])` idiom. Same
 * behavior (render a placeholder until mounted, avoiding hydration mismatches for
 * client-only values like relative times or `localStorage`), but with no state update inside
 * an effect — so it satisfies `react-hooks/set-state-in-effect`. `getServerSnapshot` returns
 * `false` to match the server HTML during hydration; `getSnapshot` returns `true` afterward,
 * which schedules the one re-render the old effect used to.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
