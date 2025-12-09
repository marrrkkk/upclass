"use client"

import { useEffect } from "react"
import { CreateResourceButton } from "./create-resource-button"
import { usePageHeader } from "@/components/page-header-context"

export function ResourcesPageWrapper({ children }: { children: React.ReactNode }) {
  const { setRightSideContent } = usePageHeader()

  useEffect(() => {
    setRightSideContent(<CreateResourceButton />)
    return () => {
      setRightSideContent(null)
    }
  }, [setRightSideContent])

  return <>{children}</>
}

