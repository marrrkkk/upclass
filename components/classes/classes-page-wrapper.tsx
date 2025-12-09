"use client"

import { useEffect, useState } from "react"
import { CreateClassButton } from "./create-class-button"
import { JoinClassButton } from "./join-class-button"
import { usePageHeader } from "@/components/page-header-context"

type ClassesPageWrapperProps = {
  children: React.ReactNode
  userRole: "teacher" | "student" | null
}

export function ClassesPageWrapper({ children, userRole }: ClassesPageWrapperProps) {
  const { setRightSideContent } = usePageHeader()

  useEffect(() => {
    setRightSideContent(
      <div className="flex items-center gap-2">
        <JoinClassButton />
        {userRole === "teacher" && <CreateClassButton />}
      </div>
    )
    return () => {
      setRightSideContent(null)
    }
  }, [setRightSideContent, userRole])

  return <>{children}</>
}

