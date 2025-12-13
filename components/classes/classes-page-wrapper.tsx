"use client"

import { useEffect, useState } from "react"
import { CreateClassButton } from "./create-class-button"
import { JoinClassButton } from "./join-class-button"
import { usePageHeaderStore } from "@/lib/stores/page-header-store"

type ClassesPageWrapperProps = {
  children: React.ReactNode
  userRole: "teacher" | "student" | null
  isAuthenticated?: boolean
}

export function ClassesPageWrapper({ children, userRole, isAuthenticated = false }: ClassesPageWrapperProps) {
  const setRightSideContent = usePageHeaderStore((state) => state.setRightSideContent)
  const setMobileRightSideContent = usePageHeaderStore((state) => state.setMobileRightSideContent)

  useEffect(() => {
    if (isAuthenticated) {
      // Desktop version with text
      setRightSideContent(
        <div className="flex items-center gap-2">
          <JoinClassButton />
          {userRole === "teacher" && <CreateClassButton />}
        </div>
      )
      // Mobile version with icon only
      setMobileRightSideContent(
        <div className="flex items-center gap-2">
          <JoinClassButton iconOnly />
          {userRole === "teacher" && <CreateClassButton iconOnly />}
        </div>
      )
    } else {
      setRightSideContent(null)
      setMobileRightSideContent(null)
    }
    return () => {
      setRightSideContent(null)
      setMobileRightSideContent(null)
    }
  }, [setRightSideContent, setMobileRightSideContent, userRole, isAuthenticated])

  return <>{children}</>
}


