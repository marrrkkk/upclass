"use client"

import { useEffect } from "react"
import { CreateClassButton } from "./create-class-button"
import { usePageHeader } from "@/components/page-header-context"

export function ClassesPageWrapper({ children }: { children: React.ReactNode }) {
  const { setRightSideContent } = usePageHeader()

  useEffect(() => {
    setRightSideContent(<CreateClassButton />)
    return () => {
      setRightSideContent(null)
    }
  }, [setRightSideContent])

  return <>{children}</>
}

