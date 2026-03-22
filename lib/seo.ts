function normalizeSiteUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url
}

function resolveSiteUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"

  return normalizeSiteUrl(configuredUrl)
}

export const siteUrl = resolveSiteUrl()

export const siteName = "UpClass"
export const siteTitle = "UpClass | Learning Management System for Realtime Teaching"
export const defaultDescription =
  "UpClass is a learning management system for focused teaching, realtime collaboration, classroom messaging, and offline-ready learning workflows."
export const siteKeywords = [
  "learning management system",
  "LMS",
  "classroom management",
  "education platform",
  "realtime whiteboard",
  "student collaboration",
  "teacher dashboard",
  "offline learning app",
]
export const socialImagePath = "/opengraph-image"

export function absoluteUrl(path = "/") {
  return new URL(path, siteUrl).toString()
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: siteUrl,
  logo: {
    "@type": "ImageObject",
    url: absoluteUrl("/icon.svg"),
  },
}

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: siteUrl,
  description: defaultDescription,
  inLanguage: "en",
  publisher: {
    "@type": "Organization",
    name: siteName,
    url: siteUrl,
  },
}

export const webApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: siteName,
  url: siteUrl,
  description: defaultDescription,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  featureList: [
    "Classroom management",
    "Realtime whiteboards",
    "Student messaging",
    "Assignment and resource organization",
    "Offline-ready classroom workflows",
  ],
}
