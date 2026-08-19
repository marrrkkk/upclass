import { headers } from "next/headers"

import { siteUrl } from "@/lib/seo"

/**
 * Absolute origin for the current request, e.g. `https://upclass.app`.
 *
 * Resolved from proxy headers so it is correct behind Vercel and on localhost,
 * falling back to the configured canonical URL. Computing this on the server
 * means shareable links (invites, deep links) render identically during SSR and
 * hydration instead of appearing after a client-side effect.
 */
export async function getRequestOrigin(): Promise<string> {
  try {
    const headerList = await headers()
    const host = headerList.get("x-forwarded-host") ?? headerList.get("host")

    if (host) {
      const protocol =
        headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
      return `${protocol}://${host}`
    }
  } catch {
    // Headers are unavailable outside a request scope; fall through.
  }

  return siteUrl
}
