"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

type OnboardRedirectProps = {
  hasOrganization: boolean
}

export function OnboardRedirect({ hasOrganization }: OnboardRedirectProps) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!hasOrganization && !pathname?.includes("/org")) {
      router.push("/org")
    }
  }, [hasOrganization, pathname, router])

  return null
}

