import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { updateSession } from "@/lib/supabase/middleware";
import { isAllowedEmail } from "@/lib/auth";

// Next.js 16 renamed the "middleware" file convention to "proxy" (same Edge
// request-interception behavior; see spec §5 "middleware allowlist guard").

/** Paths reachable without a session (the rest require auth). */
const PUBLIC_PREFIXES = ["/login", "/auth", "/not-authorized"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

/** Redirect while preserving any refreshed auth cookies from `source`. */
function redirect(
  request: NextRequest,
  source: NextResponse,
  pathname: string,
  params?: Record<string, string>,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
  return res;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response: NextResponse;
  let user: User | null;
  try {
    ({ response, user } = await updateSession(request));
  } catch {
    // Supabase env not configured yet — let /login render and explain setup.
    if (pathname.startsWith("/login")) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Not signed in: allow public paths, otherwise send to /login.
  if (!user) {
    if (isPublicPath(pathname)) return response;
    return redirect(request, response, "/login", { next: pathname });
  }

  // Signed in but not on the allowlist — the real lock (§5A).
  if (!isAllowedEmail(user.email)) {
    if (pathname === "/not-authorized") return response;
    return redirect(request, response, "/not-authorized");
  }

  // Allowed user shouldn't linger on the login page.
  if (pathname === "/login") {
    return redirect(request, response, "/");
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except Next internals, static assets, and public
     * metadata routes (manifest, service worker, robots/sitemap) which must be
     * reachable without a session.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
