"use client"

import dynamic from "next/dynamic"

const OnboardRedirect = dynamic(
  () => import("@/components/onboard-redirect").then((mod) => mod.OnboardRedirect),
  {
    ssr: false,
  },
)

export function MainLayoutClient({
  children,
  hasRole,
  isAuthenticated,
}: {
  children: React.ReactNode
  hasRole: boolean
  isAuthenticated: boolean
}) {
  return (
    <>
      {isAuthenticated ? <OnboardRedirect hasRole={hasRole} /> : null}
      {children}
    </>
  )
}
