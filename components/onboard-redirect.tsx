"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

type OnboardRedirectProps = {
  hasRole: boolean
}

export function OnboardRedirect({ hasRole }: OnboardRedirectProps) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!hasRole && !pathname?.includes("/onboard")) {
      router.push("/onboard")
    }
  }, [hasRole, pathname, router])

  return null
}

