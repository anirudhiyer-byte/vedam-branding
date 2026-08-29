import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Route guard for the internal Studio.
 *
 * In Next.js 16 `middleware.ts` is deprecated in favour of `proxy.ts`; this is
 * that file. It runs before the Studio renders and bounces anyone without a
 * valid session to the login page.
 *
 * This is a convenience, not the security boundary. Next.js's own guidance is
 * explicit that Server Actions are POSTs to the page route and that a matcher
 * change can silently drop proxy coverage, so authorization is *also* asserted
 * inside every Server Action (see lib/auth/guard.ts). Deleting this file would
 * make the Studio uglier to use, not open to the public.
 */

export const config = {
  // The login page must stay reachable, or there is no way back in.
  matcher: ["/studio", "/studio/((?!login).*)"],
};

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token).catch(() => ({
    // A missing or malformed STUDIO_SESSION_SECRET throws. Treat that as
    // "no valid session" rather than a 500 — the login page explains why.
    ok: false as const,
    reason: "malformed" as const,
  }));

  if (session.ok) {
    const response = NextResponse.next();
    // Belt and braces: the Studio is internal and must never be indexed, even
    // if a route's own metadata is ever changed.
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const login = new URL("/studio/login", request.url);
  // Carry the intended destination so login returns you where you were going.
  const target = request.nextUrl.pathname + request.nextUrl.search;
  if (target && target !== "/studio") login.searchParams.set("next", target);

  const response = NextResponse.redirect(login);
  // Clear a stale or forged cookie so the browser stops sending it.
  if (token) response.cookies.delete(SESSION_COOKIE);
  return response;
}
