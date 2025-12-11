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

  useEffect(() => {
    if (isAuthenticated) {
      setRightSideContent(
        <div className="flex items-center gap-2">
          <JoinClassButton />
          {userRole === "teacher" && <CreateClassButton />}
        </div>
      )
    } else {
      setRightSideContent(null)
    }
    return () => {
      setRightSideContent(null)
    }
  }, [setRightSideContent, userRole, isAuthenticated])

  return <>{children}</>
}

