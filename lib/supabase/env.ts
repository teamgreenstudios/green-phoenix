/**
 * Resolves the Supabase connection env vars.
 *
 * Standardized on the new publishable key (`sb_publishable_…`), with a fallback to
 * the legacy anon key so either works. See `.env.local.example`.
 *
 * Read lazily (inside the client factories) rather than at module load, so the app
 * can still render `/login` and explain setup when env is not yet configured.
 */
export function getSupabaseEnv(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase env not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) " +
        "in .env.local — see .env.local.example.",
    );
  }
  return { url, key };
}

/** True when the public Supabase env is present (used by the login page to show a setup hint). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
