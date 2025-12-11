"use client"

import { useEffect } from "react"
import { CreateResourceButton } from "./create-resource-button"
import { usePageHeaderStore } from "@/lib/stores/page-header-store"

export function ResourcesPageWrapper({ children, isAuthenticated = false }: { children: React.ReactNode; isAuthenticated?: boolean }) {
  const setRightSideContent = usePageHeaderStore((state) => state.setRightSideContent)

  useEffect(() => {
    if (isAuthenticated) {
      setRightSideContent(<CreateResourceButton />)
    } else {
      setRightSideContent(null)
    }
    return () => {
      setRightSideContent(null)
    }
  }, [setRightSideContent, isAuthenticated])

  return <>{children}</>
}

