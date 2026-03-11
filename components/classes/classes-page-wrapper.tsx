"use client"

import { useEffect, useState } from "react"
import { CreateClassButton } from "./create-class-button"
import { JoinClassButton } from "./join-class-button"
import { useClassesStore } from "@/stores/classes-store"
import { usePageHeaderStore } from "@/stores/page-header-store"

type ClassesPageWrapperProps = {
  children: React.ReactNode
  userRole: "teacher" | "student" | null
  isAuthenticated?: boolean
}

export function ClassesPageWrapper({ children, userRole, isAuthenticated = false }: ClassesPageWrapperProps) {
  const setRightSideContent = usePageHeaderStore((state) => state.setRightSideContent)
  const setMobileRightSideContent = usePageHeaderStore((state) => state.setMobileRightSideContent)
  const { setUserRole, setIsAuthenticated: setClassesIsAuthenticated, userRole: storeUserRole, isAuthenticated: storeIsAuthenticated } = useClassesStore()

  useEffect(() => {
    setUserRole(userRole)
    setClassesIsAuthenticated(isAuthenticated)
  }, [userRole, isAuthenticated, setUserRole, setClassesIsAuthenticated])

  useEffect(() => {
    if (storeIsAuthenticated) {
      // Desktop version with text
      setRightSideContent(
        <div className="flex items-center gap-2">
          <JoinClassButton />
          {storeUserRole === "teacher" && <CreateClassButton />}
        </div>
      )
      // Mobile version with icon only
      setMobileRightSideContent(
        <div className="flex items-center gap-2">
          <JoinClassButton iconOnly />
          {storeUserRole === "teacher" && <CreateClassButton iconOnly />}
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
  }, [setRightSideContent, setMobileRightSideContent, storeUserRole, storeIsAuthenticated])

  return <>{children}</>
}

