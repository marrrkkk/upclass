"use client"

import { useEffect } from "react"
import { CreateResourceButton } from "./create-resource-button"
import { usePageHeaderStore } from "@/lib/stores/page-header-store"

export function ResourcesPageWrapper({ children }: { children: React.ReactNode }) {
  const setRightSideContent = usePageHeaderStore((state) => state.setRightSideContent)

  useEffect(() => {
    setRightSideContent(<CreateResourceButton />)
    return () => {
      setRightSideContent(null)
    }
  }, [setRightSideContent])

  return <>{children}</>
}

