"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"

import {
  ClassDetailSkeleton,
  ClassesPageSkeleton,
  GenericPageSkeleton,
  HomeActivitySkeleton,
  HomeOverviewSkeleton,
  MessagesContentSkeleton,
  NotificationsContentSkeleton,
  ResourcesPageSkeleton,
  SettingsSkeleton,
} from "@/components/skeletons"

function RouteFallback({ pathname }: { pathname: string }) {
  if (pathname === "/home") {
    return (
      <div className="space-y-6">
        <GenericPageSkeleton />
        <HomeOverviewSkeleton />
        <HomeActivitySkeleton />
      </div>
    )
  }

  if (pathname === "/classes") {
    return <ClassesPageSkeleton />
  }

  if (pathname.startsWith("/classes/")) {
    return <ClassDetailSkeleton />
  }

  if (pathname === "/resources") {
    return <ResourcesPageSkeleton />
  }

  if (pathname.startsWith("/messages")) {
    return <MessagesContentSkeleton />
  }

  if (pathname === "/notifications") {
    return <NotificationsContentSkeleton />
  }

  if (pathname === "/settings") {
    return <SettingsSkeleton />
  }

  return <GenericPageSkeleton />
}

export function RouteContentTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/"

  return (
    <Suspense key={pathname} fallback={<RouteFallback pathname={pathname} />}>
      {children}
    </Suspense>
  )
}
