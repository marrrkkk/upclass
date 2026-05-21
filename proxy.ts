import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Subdomain-aware middleware.
 *
 * 1. Detects whether the request is on the `app.` subdomain (the main
 *    application) or the root domain (marketing/landing page).
 * 2. For the root domain at `/`, rewrites to `/landing` so the marketing
 *    landing page is served (lives in `(marketing)/landing/page.tsx`).
 *    App home (create/join org) lives in `(app)/page.tsx`.
 * 3. Reads the `x-org-slug` cookie and forwards it as a request header so
 *    server actions and route handlers can resolve the active organization.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";

  // Inject org slug cookie as header
  const orgSlug = request.cookies.get("x-org-slug")?.value;
  const requestHeaders = new Headers(request.headers);
  if (orgSlug) {
    requestHeaders.set("x-org-slug", orgSlug);
  }

  // Detect if we're on the app subdomain
  const isAppSubdomain = hostname.startsWith("app.");

  // If on app subdomain, let Next.js handle routing normally.
  if (isAppSubdomain) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Root domain: only allow landing page, static pages (terms, privacy, contact),
  // and API routes. Everything else redirects to app subdomain.
  const publicPaths = ["/landing", "/terms", "/privacy", "/contact", "/api/"];
  const isPublicPath = publicPaths.some((p) => url.pathname.startsWith(p));

  if (url.pathname === "/") {
    url.pathname = "/landing";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // If not a public path on root domain, redirect to app subdomain
  if (!isPublicPath) {
    const appUrl = new URL(url);
    const hostParts = hostname.split(":");
    appUrl.host = `app.${hostParts[0]}${hostParts[1] ? `:${hostParts[1]}` : ""}`;
    return NextResponse.redirect(appUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Apply middleware to all routes except static assets.
 */
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public folder assets (sw.js, manifest.json, icons, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|sw.js|manifest.json|icons/).*)",
  ],
};
