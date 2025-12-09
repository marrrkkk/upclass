"use client"

import { useEffect } from "react"
import { CreateClassButton } from "./create-class-button"
import { JoinClassButton } from "./join-class-button"
import { usePageHeader } from "@/components/page-header-context"

export function ClassesPageWrapper({ children }: { children: React.ReactNode }) {
  const { setRightSideContent } = usePageHeader()

  useEffect(() => {
    setRightSideContent(
      <div className="flex items-center gap-2">
        <JoinClassButton />
        <CreateClassButton />
      </div>
    )
    return () => {
      setRightSideContent(null)
    }
  }, [setRightSideContent])

  return <>{children}</>
}

