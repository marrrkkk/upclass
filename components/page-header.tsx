"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { UserAvatarMenu } from "@/components/user-avatar-menu"
import { usePageHeaderStore } from "@/stores/page-header-store"

const routeTitles: Record<string, string> = {
  home: "Dashboard",
  dashboard: "Dashboard",
  calendar: "Calendar",
  activity: "Activity",
  classes: "Classes",
  messages: "Messages",
  notifications: "Notifications",
  resources: "Resources",
  profile: "Profile",
  settings: "Settings",
  admin: "Organization",
  user: "Profile",
}

function titleFromSlug(slug: string | undefined) {
  if (!slug) return "UpClass"
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ")
}

type PageHeaderProps = {
  user?: { name: string | null; email: string | null; image: string | null }
  userId?: string
}

export function PageHeader({ user, userId }: PageHeaderProps) {
  const pathname = usePathname()
  const segments = pathname?.split("/").filter(Boolean) ?? []
  const orgSlug = segments[0]
  const routeTitle = routeTitles[segments[1] ?? ""] ?? "UpClass"
  const rightSideContent = usePageHeaderStore((state) => state.rightSideContent)
  const mobileRightSideContent = usePageHeaderStore((state) => state.mobileRightSideContent)
  const pageTitle = usePageHeaderStore((state) => state.pageTitle)
  const breadcrumbTitle = pageTitle ?? routeTitle

  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center">
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="flex-nowrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BreadcrumbItem className="shrink-0">
              <BreadcrumbLink asChild>
                <Link
                  href={`/${orgSlug}/dashboard`}
                  className="transition-colors hover:text-foreground truncate max-w-[88px] sm:max-w-[120px] lg:max-w-none"
                >
                  {titleFromSlug(orgSlug)}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            <span className="select-none text-muted-foreground/40 font-normal" aria-hidden="true">
              /
            </span>

            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="font-semibold text-foreground truncate max-w-[128px] sm:max-w-[180px] lg:max-w-none">
                {breadcrumbTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {mobileRightSideContent ? (
          <div className="flex items-center gap-1.5 md:hidden">{mobileRightSideContent}</div>
        ) : null}
        {rightSideContent ? (
          <div className="hidden items-center gap-1.5 md:flex">{rightSideContent}</div>
        ) : null}
        {userId ? <NotificationBell userId={userId} /> : null}
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
  )
}
