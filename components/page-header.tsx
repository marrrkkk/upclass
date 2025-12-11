"use client"

import { useEffect, useState } from "react"
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
import { Home, ChevronRight, Slash } from "lucide-react"
import React from "react"
import { cn } from "@/lib/utils"

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
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const rightSideContent = usePageHeaderStore((state) => state.rightSideContent)
  const pageTitle = usePageHeaderStore((state) => state.pageTitle)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(max-width: 767px)")
    const handle = (event: MediaQueryListEvent | MediaQueryList) => setIsMobile(event.matches)
    handle(mq)
    mq.addEventListener ? mq.addEventListener("change", handle) : mq.addListener(handle)
    return () => {
      mq.removeEventListener ? mq.removeEventListener("change", handle) : mq.removeListener(handle)
    }
  }, [])

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
      {isMobile ? (
        <div className="flex items-center justify-between min-h-[3rem]">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-primary/10 px-2 py-1 text-primary text-xs font-semibold uppercase tracking-tight">
              UpClass
            </span>
          </div>
          {user && (
            <UserAvatarMenu
              name={user.name}
              email={user.email}
              image={user.image}
              userId={userId}
            />
          )}
        </div>
      ) : (
        <div className="flex w-full items-center min-h-[3.5rem] gap-4">
          <div className="flex items-center flex-1 min-w-0">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={crumb.href}>
                    {index > 0 && (
                      <BreadcrumbSeparator className="mx-2 text-muted-foreground/40">
                        <Slash className="h-3 w-3 -rotate-12" />
                      </BreadcrumbSeparator>
                    )}
                    <BreadcrumbItem>
                      {crumb.isLast ? (
                        <BreadcrumbPage className="font-semibold text-foreground tracking-tight flex items-center gap-2">
                          {index === 0 && <Home className="h-4 w-4 text-muted-foreground" />}
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link
                            href={crumb.href}
                            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                          >
                            {index === 0 && <Home className="h-4 w-4" />}
                            {!index && index === 0 ? null : crumb.label}
                            {index === 0 ? "Home" : null}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-end min-h-[3.5rem] flex-none ml-auto">
            {rightSideContent && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500">
                {rightSideContent}
                <div className="h-6 w-px bg-border/60 mx-2" />
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
      )}
    </div>
  )
}
