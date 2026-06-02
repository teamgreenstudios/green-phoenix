/**
 * Email allowlist — the real access lock (spec §5A).
 *
 * RLS scoped to `user_id` only *isolates* users; it does not stop a stranger's Google
 * account from completing OAuth and getting an empty dashboard. `ALLOWED_EMAILS`
 * (server-only env var, comma-separated) is what actually keeps others out, enforced
 * in `middleware.ts`.
 */
export function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getAllowedEmails();
  if (allowed.length === 0) return false; // fail closed: no allowlist => nobody in
  return allowed.includes(email.toLowerCase());
}
