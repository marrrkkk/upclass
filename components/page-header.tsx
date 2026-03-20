"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import React from "react"

import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { usePageHeaderStore } from "@/stores/page-header-store"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home, Slash } from "lucide-react"

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
  const mobileRightSideContent = usePageHeaderStore((state) => state.mobileRightSideContent)
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

      // Format label to be Capitalized if it's strictly a segment name
      if (segmentNames[segment]) {
        // already capitalized in map
      } else if (label.length > 20) {
        label = label.substring(0, 20) + "..."
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
    <div className="flex w-full flex-col gap-2">
      <div className="flex min-h-[3rem] items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-primary text-xs font-semibold uppercase tracking-tight">
              UpClass
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mobileRightSideContent && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                {mobileRightSideContent}
              </div>
            )}
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

      <div className="hidden min-h-[3.5rem] w-full items-center gap-4 md:flex">
        <div className="flex min-w-0 flex-1 items-center">
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.href}>
                  {index > 0 ? (
                    <BreadcrumbSeparator className="mx-2 text-muted-foreground/40">
                      <Slash className="h-3 w-3 -rotate-12" />
                    </BreadcrumbSeparator>
                  ) : null}
                  <BreadcrumbItem>
                    {crumb.isLast ? (
                      <BreadcrumbPage className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
                        {index === 0 ? <Home className="h-4 w-4 text-muted-foreground" /> : null}
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link
                          href={crumb.href}
                          className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {index === 0 ? <Home className="h-4 w-4" /> : null}
                          {index === 0 ? "Home" : crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="ml-auto flex min-h-[3.5rem] flex-none flex-wrap items-center justify-end gap-3">
          {rightSideContent ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
              {rightSideContent}
              <div className="mx-2 h-6 w-px bg-border/60" />
            </div>
          ) : null}

          {user ? (
            <UserAvatarMenu
              name={user.name}
              email={user.email}
              image={user.image}
              userId={userId}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
