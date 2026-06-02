import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth callback for both flows:
 *  - Google OAuth + PKCE magic links arrive with `?code=…`  → exchangeCodeForSession
 *  - token-hash email links arrive with `?token_hash=…&type=…` → verifyOtp
 *
 * The email allowlist is enforced centrally in middleware, so on success we just
 * forward the user to `next` (defaults to `/`).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");
  const redirectTo = next && next.startsWith("/") ? next : "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=auth`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) return NextResponse.redirect(`${origin}/login?error=auth`);
  } else {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  return NextResponse.redirect(`${origin}${redirectTo}`);
}
