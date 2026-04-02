"use client"

import { useEffect } from "react"

import { CreateResourceButton } from "./create-resource-button"
import { usePageHeaderStore } from "@/stores/page-header-store"
import type { ManagedClassOption } from "@/lib/main-app-queries"

export function ResourcesPageWrapper({
  children,
  isAuthenticated = false,
  managedClasses = [],
}: {
  children: React.ReactNode
  isAuthenticated?: boolean
  managedClasses?: ManagedClassOption[]
}) {
  const setRightSideContent = usePageHeaderStore((state) => state.setRightSideContent)
  const setMobileRightSideContent = usePageHeaderStore((state) => state.setMobileRightSideContent)

  useEffect(() => {
    if (isAuthenticated && managedClasses.length > 0) {
      // Desktop version with text
      setRightSideContent(<CreateResourceButton managedClasses={managedClasses} />)
      // Mobile version with icon only
      setMobileRightSideContent(
        <CreateResourceButton iconOnly managedClasses={managedClasses} />,
      )
    } else {
      setRightSideContent(null)
      setMobileRightSideContent(null)
    }
    return () => {
      setRightSideContent(null)
      setMobileRightSideContent(null)
    }
  }, [setRightSideContent, setMobileRightSideContent, isAuthenticated, managedClasses])

  return <>{children}</>
}

