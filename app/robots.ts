import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/sign-in", "/sign-up"],
        disallow: [
          "/api/",
          "/_next/",
          "/activity",
          "/classes",
          "/dashboard",
          "/messages",
          "/notifications",
          "/onboard",
          "/profile",
          "/resources",
          "/settings",
          "/user",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
