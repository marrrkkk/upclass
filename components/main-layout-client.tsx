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
  hasOrganization,
  isAuthenticated,
}: {
  children: React.ReactNode
  hasOrganization: boolean
  isAuthenticated: boolean
}) {
  return (
    <>
      {isAuthenticated ? <OnboardRedirect hasOrganization={hasOrganization} /> : null}
      {children}
    </>
  )
}
