import { NextResponse, type NextRequest } from "next/server";

/**
 * Security headers for every response.
 *
 * Next.js 16 renamed this convention from `middleware.ts` to `proxy.ts`.
 *
 * It deliberately does NOT do authorization. This runs before the route and
 * cannot see per-resource permissions, so treating it as the access gate
 * invites bypasses. Auth lives in src/server/auth-guards.ts and runs on every
 * query and mutation; the (app) layout redirects signed-out users. See
 * docs/adr/0003-authorization-in-the-data-layer.md.
 */
export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
