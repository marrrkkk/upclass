"use client"

import { useEffect } from "react"
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
  const { setUserRole, setIsAuthenticated: setClassesIsAuthenticated } = useClassesStore()

  useEffect(() => {
    setUserRole(userRole)
    setClassesIsAuthenticated(isAuthenticated)
  }, [userRole, isAuthenticated, setUserRole, setClassesIsAuthenticated])

  useEffect(() => {
    setRightSideContent(null)
    setMobileRightSideContent(null)

    return () => {
      setRightSideContent(null)
      setMobileRightSideContent(null)
    }
  }, [setRightSideContent, setMobileRightSideContent])

  return <>{children}</>
}

