"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { usePageHeaderStore } from "@/lib/stores/page-header-store"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"
import React from "react"

// Map route segments to display names
const segmentNames: Record<string, string> = {
  home: "Home",
  classes: "Classes",
  resources: "Resources",
  favorites: "Favorites",
  settings: "Settings",
  notifications: "Notifications",
  messages: "Messages",
  user: "Profile",
}

type PageHeaderProps = {
  user?: {
    name: string | null
    email: string | null
    image: string | null
  }
  userId?: string
}

export function PageHeader({ user, userId }: PageHeaderProps) {
  const pathname = usePathname()
  const rightSideContent = usePageHeaderStore((state) => state.rightSideContent)
  const pageTitle = usePageHeaderStore((state) => state.pageTitle)

  // Generate breadcrumb items from the pathname
  const generateBreadcrumbs = () => {
    if (!pathname) return []

    const segments = pathname.split("/").filter(Boolean)
    const breadcrumbs: { label: string; href: string; isLast: boolean }[] = []

    let currentPath = ""
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const isLast = index === segments.length - 1

      // Get display name for the segment
      let label = segmentNames[segment] || segment

      // Handle dynamic segments (UUIDs, IDs)
      if (segment.match(/^[0-9a-f-]{36}$/i) || !segmentNames[segment]) {
        // It's a UUID or unknown segment - use pageTitle if it's the last segment
        if (isLast && pageTitle) {
          label = pageTitle
        } else if (segment.match(/^[0-9a-f-]{36}$/i)) {
          // It's a UUID but not the last segment or no pageTitle
          const parent = segments[index - 1]
          if (parent === "resources") label = "Resource"
          else if (parent === "classes") label = "Class"
          else if (parent === "user") label = "User"
          else if (parent === "messages") label = "Chat"
          else label = segment
        }
      }

      breadcrumbs.push({
        label,
        href: currentPath,
        isLast,
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  return (
    <div className="flex items-center justify-between w-full">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.href}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage>
                    {index === 0 && <Home className="h-4 w-4 mr-1.5 inline" />}
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>
                      {index === 0 && <Home className="h-4 w-4 mr-1.5 inline" />}
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex items-center gap-3">
        {rightSideContent}
        {user && (
          <UserAvatarMenu
            name={user.name}
            email={user.email}
            image={user.image}
            userId={userId}
          />
        )}
      </div>
    </div>
  )
}
