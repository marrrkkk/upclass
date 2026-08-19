"use client"

export function ResourcesPageWrapper({
  children,
}: {
  children: React.ReactNode
  isAuthenticated?: boolean
}) {
  return <>{children}</>
}
