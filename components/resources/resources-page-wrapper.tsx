"use client"

import { useEffect } from "react"
import { CreateResourceButton } from "./create-resource-button"
import { usePageHeaderStore } from "@/lib/stores/page-header-store"

export function ResourcesPageWrapper({ children, isAuthenticated = false }: { children: React.ReactNode; isAuthenticated?: boolean }) {
  const setRightSideContent = usePageHeaderStore((state) => state.setRightSideContent)
  const setMobileRightSideContent = usePageHeaderStore((state) => state.setMobileRightSideContent)

  useEffect(() => {
    if (isAuthenticated) {
      // Desktop version with text
      setRightSideContent(<CreateResourceButton />)
      // Mobile version with icon only
      setMobileRightSideContent(<CreateResourceButton iconOnly />)
    } else {
      setRightSideContent(null)
      setMobileRightSideContent(null)
    }
    return () => {
      setRightSideContent(null)
      setMobileRightSideContent(null)
    }
  }, [setRightSideContent, setMobileRightSideContent, isAuthenticated])

  return <>{children}</>
}


