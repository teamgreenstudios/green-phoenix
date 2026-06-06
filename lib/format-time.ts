/**
 * Relative-time label for the "Updated …" hint beside the Jobs refresh button.
 * Called on the CLIENT only (see components/jobs/jobs-refresh.tsx, which renders
 * it after mount) so "now" matches the user's clock and there's no SSR hydration
 * mismatch.
 *
 * ── YOUR TURN ──────────────────────────────────────────────────────────────
 * Turn the placeholder below into a short relative label, e.g.
 *   "just now", "5m ago", "3h ago", "2d ago".
 * Design choices that actually matter here:
 *   • thresholds + units — under a minute = "just now"? then minutes → hours →
 *     days → weeks? where do you stop and fall back to an absolute date?
 *   • wording — terse ("5m ago") vs friendly ("5 minutes ago")
 *   • implementation — Intl.RelativeTimeFormat (locale-aware, handles plurals)
 *     vs simple manual math (full control, no locale baggage)
 *   • edge cases — invalid date, future timestamps (clock skew), very old rows
 * Aim for ~5–10 lines. The current body is a safe placeholder that just shows a
 * locale date string, so the page works until you swap it in.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  // TODO(you): replace this placeholder with a relative label using
  // `now.getTime() - then.getTime()` (milliseconds elapsed).
  void now; // placeholder keeps `now` "used" until you implement the real logic
  return then.toLocaleDateString();
}
