import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { validateOrgAccess } from "@/lib/org-validation"

// Routes that don't need org validation
const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api",
  "/onboard",
  "/org",
  "/contact",
  "/terms",
  "/privacy",
  "/_next",
  "/favicon.ico",
  "/icon.svg",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image",
  "/twitter-image",
]

// Check if a route is public without letting the root entry match every path.
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    route === "/"
      ? pathname === "/"
      : pathname === route || pathname.startsWith(`${route}/`),
  )
}

// Extract org slug from pathname
function getOrgSlug(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length > 0 && !isPublicRoute(`/${segments[0]}`)) {
    return segments[0]
  }
  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip proxy for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Get org slug from URL
  const orgSlug = getOrgSlug(pathname)

  // If no org slug in URL, redirect to org selection
  if (!orgSlug) {
    return NextResponse.redirect(new URL("/org", request.url))
  }

  // Get session to check if user is authenticated
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  // If not authenticated, redirect to sign-in
  if (!session?.user) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("from", pathname)
    return NextResponse.redirect(signInUrl)
  }

  const userId = session.user.id

  // Validate org access
  const { valid, reason } = await validateOrgAccess(userId, orgSlug)

  if (!valid) {
    const orgUrl = new URL("/org", request.url)
    
    if (reason === "org_not_found") {
      orgUrl.searchParams.set("error", "Organization not found")
    } else if (reason === "not_a_member") {
      orgUrl.searchParams.set("error", "You are not a member of this organization")
    }
    
    return NextResponse.redirect(orgUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
